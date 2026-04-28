    function hdrs(extra) {
      return Object.assign(
        { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + (session?.access_token || SB_KEY), 'Content-Type': 'application/json' },
        extra || {}
      );
    }
    var _syncActive = 0;
    var _syncOfflineTimer = null;
    function _syncShow(spinning, text) {
      var el = document.getElementById('sync-indicator');
      var sp = document.getElementById('sync-spinner');
      var tx = document.getElementById('sync-status-text');
      if (!el) return;
      if (!text) { el.style.display = 'none'; return; }
      el.style.display = 'inline-flex';
      sp.style.display = spinning ? 'block' : 'none';
      tx.textContent = text;
    }
    function _syncStart() {
      _syncActive++;
      if (_syncActive === 1) _syncShow(true, 'Syncing');
    }
    function _syncEnd(ok) {
      _syncActive = Math.max(0, _syncActive - 1);
      if (_syncActive > 0) return;
      if (ok) { _syncShow(false, 'Synced'); setTimeout(function(){ if (_syncActive === 0) _syncShow(false, null); }, 1500); }
      else { _syncShow(false, 'Sync failed'); setTimeout(function(){ if (_syncActive === 0) _syncShow(false, null); }, 3000); }
    }
    window.addEventListener('offline', function() { _syncShow(false, 'Offline'); });
    window.addEventListener('online', function() { if (_syncActive === 0) _syncShow(false, null); });

    async function api(path, opts) {
      opts = opts || {};
      // Merge caller headers with auth headers — do NOT let opts.headers overwrite auth
      var mergedHeaders = Object.assign(hdrs(), opts.headers || {});
      var fetchOpts = Object.assign({}, opts, { headers: mergedHeaders });
      _syncStart();
      try {
        var r = await fetch(SB_URL + '/rest/v1/' + path, fetchOpts);
        if (r.status === 401) {
          var s = await refresh();
          if (s) { session = s; updateAvatar(); mergedHeaders = Object.assign(hdrs(), opts.headers || {}); fetchOpts = Object.assign({}, opts, { headers: mergedHeaders }); r = await fetch(SB_URL + '/rest/v1/' + path, fetchOpts); }
          if (r.status === 401) { _syncEnd(false); signOut(); throw new Error('Unauthorized'); }
        }
        if (!r.ok) { _syncEnd(false); throw new Error('API ' + r.status); }
        _syncEnd(true);
        return r;
      } catch(e) { _syncEnd(false); throw e; }
    }
    async function fetchAll() { return (await api('tasks?order=created_at.asc')).json(); }
    // ORB-23: Offline queue helpers
    function _queueOffline(op) {
      try { var q = JSON.parse(localStorage.getItem('orbiter_outbox') || '[]'); q.push(op); localStorage.setItem('orbiter_outbox', JSON.stringify(q)); } catch (e) {}
    }
    function _dequeueOffline(taskId) {
      try { var q = JSON.parse(localStorage.getItem('orbiter_outbox') || '[]'); q = q.filter(function(op) { return !(op.type === 'upsert' && op.task && op.task.id === taskId); }); localStorage.setItem('orbiter_outbox', JSON.stringify(q)); } catch (e) {}
    }
    async function _flushOutbox() {
      var q = JSON.parse(localStorage.getItem('orbiter_outbox') || '[]');
      if (!q.length) return false;
      var remaining = [];
      for (var i = 0; i < q.length; i++) {
        var op = q[i];
        try {
          if (op.type === 'upsert') await upsert(op.task);
          else if (op.type === 'patch') await patch(op.id, op.fields);
          else if (op.type === 'delete') await deleteTask(op.id);
        } catch (e) { remaining.push(op); }
      }
      localStorage.setItem('orbiter_outbox', JSON.stringify(remaining));
      return remaining.length < q.length;
    }
    window.addEventListener('online', async function() {
      var flushed = await _flushOutbox();
      if (flushed) { syncTasks(); toast('Offline tasks synced'); }
    });

    // ORB-82: upsert = POST with resolution=merge-duplicates for new tasks
    // navigator.onLine omitted — unreliable on iOS PWA; let fetch() fail naturally
    async function upsert(t) {
      var payload = { id: t.id, user_id: t.user_id, title: t.title, notes: t.notes || '', due_date: t.due_date || null, defer_date: t.defer_date || null, is_completed: t.is_completed || false, is_flagged: t.is_flagged || false, priority: t.priority || 'None', project_id: t.project_id || null, tag_ids: t.tag_ids || '[]', created_at: t.created_at, completed_at: t.completed_at || null, repeat_rule: t.repeat_rule || 'None', parent_id: t.parent_id || null, sort_order: t.sort_order || 0, last_reviewed: t.last_reviewed || null, next_review_date: t.next_review_date || null, review_frequency_num: t.review_frequency_num || null, review_frequency_unit: t.review_frequency_unit || null, is_in_review: t.is_in_review || false, is_today_task: t.is_today_task || false, updated_at: t.updated_at };
      await api('tasks', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify(payload) });
    }
    // ORB-82: patch = PATCH for targeted field updates (editing existing tasks)
    async function patch(id, fields) {
      fields.updated_at = fields.updated_at || new Date().toISOString();
      await api('tasks?id=eq.' + id, { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(fields) });
    }
    // ORB-55: deleteTask uses the correct merged-header path via api()
    async function deleteTask(id) {
      await api('tasks?id=eq.' + id, { method: 'DELETE', headers: { 'Prefer': 'return=minimal' } });
    }
    async function markDone(t) { await patch(t.id, { is_completed: true, completed_at: new Date().toISOString() }); }
