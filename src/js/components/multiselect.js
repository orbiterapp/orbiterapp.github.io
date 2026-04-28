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
      var now = new Date().toISOString();
      toComplete.forEach(function (t) { t.is_completed = true; t.completed_at = now; t.updated_at = now; });
      exitMsMode();
      render();
      toast('Completed ' + toComplete.length + ' task' + (toComplete.length !== 1 ? 's' : ''));
      await Promise.all(toComplete.map(function (t) { return upsert(t).catch(function () {}); }));
    }
    function bulkDelete() {
      var ids = Array.from(_msIds);
      var n = ids.length;
      var doDelete = function () {
        ids.forEach(function (id) {
          tasks = tasks.filter(function (t) { return t.id !== id; });
          deleteTask(id).catch(function () {});
        });
        exitMsMode();
        render();
        toast('Deleted ' + n + ' task' + (n !== 1 ? 's' : ''));
      };
      if (localStorage.getItem('confirm_before_delete') === 'true') {
        if (!confirm('Delete ' + n + ' task' + (n !== 1 ? 's' : '') + '?')) return;
      }
      doDelete();
    }

    // â”€â”€â”€ Dark / Light Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // â”€â”€â”€ ORB-196: User Preferences (server-side sync) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
