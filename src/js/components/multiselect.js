    var _msMode = false;
    var _msIds = new Set();
    function enterMsMode(id) {
      _msMode = true; _msIds.clear(); _msIds.add(id);
      haptic('medium');
      render(); _updateMsToolbar();
    }
    function exitMsMode() {
      _msMode = false; _msIds.clear();
      document.getElementById('ms-toolbar').classList.remove('show');
      render();
    }
    function toggleMsRow(id, e) {
      e && e.stopPropagation();
      if (_msIds.has(id)) _msIds.delete(id); else _msIds.add(id);
      if (_msIds.size === 0) { exitMsMode(); return; }
      var row = document.getElementById('task-' + id);
      if (row) row.classList.toggle('ms-selected', _msIds.has(id));
      var chk = row && row.querySelector('.ms-chk');
      if (chk) chk.classList.toggle('checked', _msIds.has(id));
      _updateMsToolbar();
    }
    function selectAllVisible() {
      var rows = document.querySelectorAll('#task-area .task-row');
      rows.forEach(function(row) { var id = row.id.replace('task-', ''); if (id) _msIds.add(id); });
      render(); _updateMsToolbar();
    }
    function _updateMsToolbar() {
      var tb = document.getElementById('ms-toolbar');
      var ct = document.getElementById('ms-count');
      var n = _msIds.size;
      if (ct) ct.textContent = n + ' selected';
      if (tb) tb.classList.toggle('show', n > 0);
    }
    async function bulkComplete() {
      var ids = Array.from(_msIds);
      var toComplete = tasks.filter(function (t) { return ids.includes(t.id) && !t.is_completed; });
      var backups = toComplete.map(function (t) { return { id: t.id, is_completed: t.is_completed, completed_at: t.completed_at, updated_at: t.updated_at }; });
      var now = new Date().toISOString();
      toComplete.forEach(function (t) { t.is_completed = true; t.completed_at = now; t.updated_at = now; });
      exitMsMode();
      render();
      var n = toComplete.length;
      toast('Completed ' + n + ' task' + (n !== 1 ? 's' : ''), 4000, function () {
        backups.forEach(function (b) {
          var t = tasks.find(function (x) { return x.id === b.id; });
          if (t) { t.is_completed = b.is_completed; t.completed_at = b.completed_at; t.updated_at = b.updated_at; patch(t.id, { is_completed: t.is_completed, completed_at: t.completed_at, updated_at: t.updated_at }).catch(function(){}); }
        });
        render(); toast('Restored');
      });
      await Promise.all(toComplete.map(function (t) { return patch(t.id, { is_completed: true, completed_at: t.completed_at, updated_at: t.updated_at }).catch(function () {}); }));
    }
    function bulkDelete() {
      var ids = Array.from(_msIds);
      var n = ids.length;
      var backups = tasks.filter(function (t) { return ids.includes(t.id); }).map(function (t) { return Object.assign({}, t); });
      tasks = tasks.filter(function (t) { return !ids.includes(t.id); });
      exitMsMode();
      render();
      ids.forEach(function (id) { deleteTask(id).catch(function () {}); });
      toast('Deleted ' + n + ' task' + (n !== 1 ? 's' : ''), 4000, function () {
        backups.forEach(function (t) { tasks.push(t); upsert(t).catch(function () {}); });
        render(); toast('Restored');
      });
    }

    // â"€â"€â"€ Dark / Light Mode â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    // â"€â"€â"€ ORB-196: User Preferences (server-side sync) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    async function loadUserPreferences() {
      if (!session) return;
      try {
        var res = await (await api('user_preferences?user_id=eq.' + session.user.id + '&select=preferences', { method: 'GET' })).json();
        if (res && res.length) {
          var prefs = res[0].preferences || {};
          if (prefs.theme) { localStorage.setItem('theme', prefs.theme); loadTheme(); }
          if (prefs.accent_color) { localStorage.setItem('accent_color', prefs.accent_color); loadAccentColor(); }
          if (prefs.confirm_before_delete !== undefined) localStorage.setItem('confirm_before_delete', prefs.confirm_before_delete);
          if (prefs.inbox_sort) { inboxSort = prefs.inbox_sort; localStorage.setItem('inbox_sort', inboxSort); render(); }
          if (prefs.quiet_hours && typeof prefs.quiet_hours === 'object') { try { localStorage.setItem('orbiter_quiet_hours', JSON.stringify(prefs.quiet_hours)); initQuietHoursUI(); _syncQuietHoursToSW(); } catch(e) {} }
        }
      } catch (e) { }
    }
