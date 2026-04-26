    function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); }
    function signInWithGoogle() { const r = encodeURIComponent(window.location.href.split('#')[0]); window.location.href = SB_URL + '/auth/v1/authorize?provider=google&prompt=select_account&redirect_to=' + r; }
    async function signOut() { toggleMenu(false); await fetch(SB_URL + '/auth/v1/logout', { method: 'POST', headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + (session?.access_token || '') } }).catch(() => { }); session = null; tasks = []; localStorage.removeItem('sb_access_token'); localStorage.removeItem('sb_refresh_token'); show('screen-login'); }

    // ORB-123: Export tasks to JSON and CSV
    function downloadFile(name, type, content) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content], { type: type }));
      a.download = name;
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
    async function exportJSON() {
      try {
        var data = await (await api('tasks?order=created_at.desc')).json();
        downloadFile('orbiter-export.json', 'application/json', JSON.stringify(data, null, 2));
        toast('Exported ' + data.length + ' tasks');
      } catch (e) { toast('Export failed'); }
    }
    function csvEscape(s) { s = String(s || ''); if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'; return s; }
    async function exportCSV() {
      try {
        var data = await (await api('tasks?order=created_at.desc')).json();
        var header = 'id,title,notes,priority,due_date,is_completed,is_flagged,project_id,energy_level';
        var rows = data.map(function (t) { return [t.id, csvEscape(t.title), csvEscape(t.notes || ''), t.priority, t.due_date || '', t.is_completed, t.is_flagged, t.project_id || '', t.energy_level || ''].join(','); });
        downloadFile('orbiter-export.csv', 'text/csv', [header].concat(rows).join('\n'));
        toast('Exported ' + data.length + ' tasks');
      } catch (e) { toast('Export failed'); }
    }
    function parseHash() { const p = new URLSearchParams(window.location.hash.substring(1)); const t = p.get('access_token'), r = p.get('refresh_token'); if (!t) return null; try { const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); const pad = b + '===='.slice(b.length % 4 || 4); const d = JSON.parse(atob(pad)); if (r) localStorage.setItem('sb_refresh_token', r); return { access_token: t, user: { id: d.sub, email: d.email, user_metadata: d.user_metadata || {} } }; } catch (e) { return null; } }
    // verify() and refresh() are now in auth.js (ORB-21 — shared auth module)
    // They are loaded via <script src="auth.js"> before this script.

    // â”€â”€â”€ API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ORB-20: SB_KEY is the Supabase anon/public key — safe to expose client-side
    // as long as Row Level Security (RLS) is enabled on all tables (tasks, projects).
    // Never use the service_role key here.

    // ORB-82 fix: merge headers explicitly so opts.headers never wipes out auth headers

    function updateAvatar() {
      const m = session?.user?.user_metadata || {}, e = session?.user?.email || '',
        n = m.full_name || m.name || e.split('@')[0] || '?',
        i = n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        a = m.avatar_url || m.picture,
        b = document.getElementById('avatar-btn');
      const html = a ? '<img src="' + esc(a) + '" alt="">' : i;
      if (b) b.innerHTML = html;
      const mn = document.getElementById('m-name'); if (mn) mn.textContent = n;
      const me = document.getElementById('m-email'); if (me) me.textContent = e;
      // Sync settings page user card
      const sav = document.getElementById('settings-av'); if (sav) sav.innerHTML = html;
      const sn = document.getElementById('settings-user-name'); if (sn) sn.textContent = n;
      const se = document.getElementById('settings-user-email'); if (se) se.textContent = e;
    }
    function toggleMenu(f) { const el = document.getElementById('menu-overlay'); if (!el) return; const o = f !== undefined ? f : !el.classList.contains('open'); el.classList.toggle('open', o); }
    function handleMenuClick(e) { if (e.target.id === 'menu-overlay') toggleMenu(false); }

    // â”€â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
