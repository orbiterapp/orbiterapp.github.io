import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import webpush from 'npm:web-push';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;
const VAPID_PUBLIC_KEY = 'BAAoNfQmuqd8RgUMJXfJ2TQxTYRIXjmET9Cz6hjNOT-7XX-ZkS0vfv0j81aDvcJr6KHHVLUk5MQKG1dcIE1BPN0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (_req) => {
  try {
    const now = Date.now();
    const { data: candidates, error: taskErr } = await supabase
      .from('tasks')
      .select('id, title, user_id, due_date, notify_before_minutes')
      .eq('is_completed', false)
      .is('notified_at', null)
      .not('due_date', 'is', null)
      .gte('due_date', new Date(now - 2 * 60 * 60 * 1000).toISOString())
      .lte('due_date', new Date(now + 25 * 60 * 60 * 1000).toISOString());

    if (taskErr) throw taskErr;

    const ready = (candidates ?? []).filter((t: { due_date: string; notify_before_minutes: number }) => {
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

      const count = userTasks.length;
      const taskId = userTasks[0].id;
      const payload = count === 1
        ? JSON.stringify({ taskTitle: userTasks[0].title, dueDate: userTasks[0].due_date, taskId, count })
        : JSON.stringify({ title: `${count} tasks due soon`, body: userTasks.slice(0, 3).map((t: { title: string }) => `• ${t.title}`).join('\n'), taskId, count });

      for (const sub of subs) {
        try {
          const parsed = JSON.parse(sub.subscription);
          const result = await webpush.sendNotification(parsed, payload);
          if (result.statusCode === 201 || result.statusCode === 200) {
            sent++;
            for (const t of userTasks) if (!notified.includes(t.id)) notified.push(t.id);
          } else if (result.statusCode === 410 || result.statusCode === 404) {
            stale.push(sub.id);
          }
        } catch (e: unknown) {
          const err = e as { statusCode?: number };
          if (err.statusCode === 410 || err.statusCode === 404) stale.push(sub.id);
        }
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
