    function toggleArchiveView() {
      showArchived = !showArchived;
      _archiveSelected.clear();
      document.getElementById('archive-label').textContent = showArchived ? 'Back to Tasks' : 'View Archive';
      render();
    }
    async function unarchiveTask(id) {
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      var backup = Object.assign({}, task);
      task.is_completed = false; task.completed_at = null; task.updated_at = new Date().toISOString();
      haptic('medium'); render();
      try {
        await upsert(task);
        toast('Restored', 3500, function () {
          Object.assign(task, backup);
          upsert(task).catch(function () { });
          render();
          toast('Archived âœ“');
        });
      } catch (e) { toast('Failed to sync'); }
    }

    function toggleArchiveRow(id) { if (_archiveSelected.has(id)) _archiveSelected.delete(id); else _archiveSelected.add(id); render(); }
    async function restoreArchiveSelected() {
      if (!_archiveSelected.size) return;
      var ids = Array.from(_archiveSelected); var now = new Date().toISOString();
      ids.forEach(function (id) { var t = tasks.find(function (x) { return x.id === id; }); if (t) { t.is_completed = false; t.completed_at = null; t.updated_at = now; } });
      _archiveSelected.clear(); render(); toast('Restored ' + ids.length + ' task' + (ids.length > 1 ? 's' : ''));
      for (var _i = 0; _i < ids.length; _i++) { var _t = tasks.find(function (x) { return x.id === ids[_i]; }); if (_t) await upsert(_t).catch(function () { }); }
    }
    async function deleteArchiveSelected() {
      if (!_archiveSelected.size) return;
      var ids = Array.from(_archiveSelected); var count = ids.length;
      tasks = tasks.filter(function (t) { return !_archiveSelected.has(t.id); });
      _archiveSelected.clear(); render(); toast('Deleted ' + count + ' task' + (count > 1 ? 's' : '') + ' permanently');
      for (var _i = 0; _i < ids.length; _i++) { await deleteTask(ids[_i]).catch(function () { }); }
    }

    // â”€â”€â”€ Keyboard Shortcuts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
