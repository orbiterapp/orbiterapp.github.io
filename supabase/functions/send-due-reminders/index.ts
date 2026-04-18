// ORB-117: Edge Function — send web push notifications for tasks due within the next hour
// Deploy: npx supabase functions deploy send-due-reminders
// Schedule via pg_cron every 15 minutes (see README)
// @ts-ignore: Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;
const VAPID_PUBLIC_KEY = 'BAAoNfQmuqd8RgUMJXfJ2TQxTYRIXjmET9Cz6hjNOT-7XX-ZkS0vfv0j81aDvcJr6KHHVLUk5MQKG1dcIE1BPN0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Build VAPID Authorization header
async function buildVapidAuth(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({ aud: audience, exp: expiry, sub: VAPID_SUBJECT })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = `${header}.${payload}`;

  const keyBytes = Uint8Array.from(atob(VAPID_PRIVATE_KEY.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `vapid t=${unsigned}.${sigB64},k=${VAPID_PUBLIC_KEY}`;
}

async function sendPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, title: string, body: string, taskId: string) {
  const vapidAuth = await buildVapidAuth(subscription.endpoint);

  const payload = JSON.stringify({ title, body, taskId });

  // Encrypt payload using Web Push encryption (RFC 8291)
  // Using a simplified approach — encrypt with the subscription's public key
  const p256dh = Uint8Array.from(atob(subscription.keys.p256dh.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const auth = Uint8Array.from(atob(subscription.keys.auth.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

  // Generate ephemeral key pair for ECDH
  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
  const ephemeralPubRaw = await crypto.subtle.exportKey('raw', ephemeral.publicKey);

  // Import subscriber's public key
  const subPubKey = await crypto.subtle.importKey('raw', p256dh, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: subPubKey }, ephemeral.privateKey, 256);

  // HKDF to derive content encryption key + nonce
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await crypto.subtle.importKey('raw', new Uint8Array([...new Uint8Array(sharedBits), ...auth]), 'HKDF', false, ['deriveKey', 'deriveBits']);

  const prk = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('Content-Encoding: auth\0') },
    ikm, { name: 'AES-GCM', length: 128 }, false, ['encrypt']
  );

  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(12) }, prk, new TextEncoder().encode(payload));

  const body_bytes = new Uint8Array([
    ...salt,
    ...[0, 0, 16, 0], // record size (4096)
    ...[ephemeralPubRaw.byteLength],
    ...new Uint8Array(ephemeralPubRaw),
    ...new Uint8Array(enc)
  ]);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidAuth,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '3600',
    },
    body: body_bytes,
  });

  return res.status;
}

Deno.serve(async (_req) => {
  try {
    const { data: dueTasks, error: taskErr } = await supabase
      .from('tasks')
      .select('id, title, user_id, due_date, notify_before_minutes')
      .eq('is_completed', false)
      .is('notified_at', null)
      .not('due_date', 'is', null)
      .lte('due_date', new Date(Date.now() + 16 * 60 * 1000).toISOString())
      .gte('due_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (taskErr) throw taskErr;

    const now = Date.now();
    const ready = (dueTasks ?? []).filter((t: { due_date: string; notify_before_minutes: number }) => {
      const notifyAt = new Date(t.due_date).getTime() - (t.notify_before_minutes ?? 30) * 60 * 1000;
      return notifyAt <= now;
    });

    if (!ready.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

    const byUser: Record<string, typeof ready> = {};
    for (const t of ready) {
      if (!byUser[t.user_id]) byUser[t.user_id] = [];
      byUser[t.user_id].push(t);
    }

    let sent = 0;
    const stale: string[] = [];
    const notified: string[] = [];

    for (const [userId, userTasks] of Object.entries(byUser)) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, subscription')
        .eq('user_id', userId);

      if (!subs?.length) continue;

      const title = userTasks.length === 1
        ? `Due soon: ${userTasks[0].title}`
        : `${userTasks.length} tasks due soon`;
      const body = userTasks.length === 1
        ? 'Tap to open Orbiter'
        : userTasks.slice(0, 3).map((t: { title: string }) => `• ${t.title}`).join('\n');
      const taskId = userTasks[0].id;

      for (const sub of subs) {
        try {
          const parsed = JSON.parse(sub.subscription);
          const status = await sendPush(parsed, title, body, taskId);
          if (status === 201 || status === 200) {
            sent++;
            for (const t of userTasks) notified.push(t.id);
          } else if (status === 410 || status === 404) {
            stale.push(sub.id);
          }
        } catch (_e) { /* skip */ }
      }
    }

    if (notified.length) {
      await supabase.from('tasks').update({ notified_at: new Date().toISOString() }).in('id', notified);
    }
    if (stale.length) {
      await supabase.from('push_subscriptions').delete().in('id', stale);
    }

    return new Response(JSON.stringify({ sent, stale_removed: stale.length }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
