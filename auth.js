// auth.js — Shared Supabase auth helpers (ORB-21)
// Both index.html and quick.html import this via <script src="auth.js"></script>
// before their own <script> blocks so SB_URL / SB_KEY are already defined.

/**
 * Verify an access token by hitting /auth/v1/user.
 * Returns a session object or null.
 */
async function verify(t) {
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + t }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? { access_token: t, user: u } : null;
  } catch { return null; }
}

/**
 * Attempt a refresh-token grant.
 * Stores the new tokens in localStorage if successful.
 * Returns a session object or null.
 */
async function refresh() {
  const rt = localStorage.getItem('sb_refresh_token');
  if (!rt) return null;
  try {
    const r = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt })
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.access_token) return null;
    localStorage.setItem('sb_access_token', d.access_token);
    if (d.refresh_token) localStorage.setItem('sb_refresh_token', d.refresh_token);
    return { access_token: d.access_token, user: d.user };
  } catch { return null; }
}

/**
 * Clear all session data from localStorage and memory.
 * Call this on sign-out or when a 401 cannot be recovered.
 */
function clearSession() {
  localStorage.removeItem('sb_access_token');
  localStorage.removeItem('sb_refresh_token');
}

/**
 * Bootstrap a session: check hash → stored token → refresh token.
 * Returns a session or null. Does NOT redirect to login — caller decides.
 * ORB-26: Detects double-expiry (access + refresh token expired) and clears all tokens.
 */
async function bootstrapSession() {
  // 1. OAuth redirect hash
  const p = new URLSearchParams(window.location.hash.substring(1));
  const ht = p.get('access_token'), hr = p.get('refresh_token');
  if (ht) {
    try {
      const b = ht.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = b + '===='.slice(b.length % 4 || 4);
      const d = JSON.parse(atob(pad));
      if (hr) localStorage.setItem('sb_refresh_token', hr);
      localStorage.setItem('sb_access_token', ht);
      history.replaceState(null, '', window.location.pathname);
      return { access_token: ht, user: { id: d.sub, email: d.email, user_metadata: d.user_metadata || {} } };
    } catch { /* fall through */ }
  }
  // 2. Stored access token
  const sat = localStorage.getItem('sb_access_token');
  if (sat) {
    const s = await verify(sat);
    if (s) return s;
    // Access token invalid — try refresh
  }
  // 3. Refresh token
  const rt = localStorage.getItem('sb_refresh_token');
  if (rt) {
    const s = await refresh();
    if (s) return s;
    // ORB-26: Refresh token also failed — double-expiry detected
    // Clear all tokens and force re-auth
    clearSession();
    console.warn('ORB-26: Both access and refresh tokens expired — cleared session');
    return null;
  }
  // 4. Nothing — clear stale tokens
  clearSession();
  return null;
}

/**
 * ORB-26: Check if user has any valid session.
 * Returns true if either access token is valid OR refresh token exists.
 * Use this to decide whether to show login screen or app.
 */
async function hasValidSession() {
  const sat = localStorage.getItem('sb_access_token');
  if (sat) {
    const s = await verify(sat);
    if (s) return true;
  }
  const rt = localStorage.getItem('sb_refresh_token');
  if (rt) {
    const s = await refresh();
    if (s) return true;
  }
  return false;
}

/**
 * ORB-26: Force logout due to expired tokens.
 * Clears all session data and optionally redirects to login.
 */
function forceLogout(redirectToLogin = true) {
  clearSession();
  if (redirectToLogin && typeof window !== 'undefined') {
    // Reload to trigger login screen
    window.location.href = window.location.pathname;
  }
}
