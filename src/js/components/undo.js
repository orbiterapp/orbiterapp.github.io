    // Full undo stack — supports complete, delete, update, bulk operations
    var _undoStack = [];
    var _MAX_UNDO = 20;

    function pushUndo(entry) {
      _undoStack.push(entry);
      if (_undoStack.length > _MAX_UNDO) _undoStack.shift();
      var btn = document.getElementById('undo-btn');
      if (btn) btn.style.display = 'flex';
    }

    function popUndo() {
      var entry = _undoStack.pop();
      var btn = document.getElementById('undo-btn');
      if (btn) btn.style.display = _undoStack.length > 0 ? 'flex' : 'none';
      return entry;
    }

    window.undoLast = async function () {
      var entry = popUndo();
      if (!entry) { toast('Nothing to undo'); return; }
      haptic('medium');
      try {
        if (entry.type === 'complete') {
          var t = tasks.find(function (x) { return x.id === entry.id; });
          if (t) {
            t.is_completed = false; t.completed_at = null; t.updated_at = new Date().toISOString();
            render();
            await patch(t.id, { is_completed: false, completed_at: null, updated_at: t.updated_at }).catch(function(){});
          }
          toast('Undone: task restored');
        } else if (entry.type === 'delete') {
          entry.tasks.forEach(function (snap) {
            if (!tasks.find(function(x){ return x.id === snap.id; })) tasks.push(Object.assign({}, snap));
          });
          render();
          for (var i = 0; i < entry.tasks.length; i++) { await upsert(entry.tasks[i]).catch(function(){}); }
          toast('Undone: ' + entry.tasks.length + ' task' + (entry.tasks.length !== 1 ? 's' : '') + ' restored');
        } else if (entry.type === 'update') {
          var t2 = tasks.find(function (x) { return x.id === entry.id; });
          if (t2) {
            Object.assign(t2, entry.before);
            render();
            await patch(t2.id, entry.before).catch(function(){});
          }
          toast('Undone: changes reverted');
        } else if (entry.type === 'bulk_complete') {
          var now = new Date().toISOString();
          entry.ids.forEach(function(id) {
            var t3 = tasks.find(function(x){ return x.id === id; });
            if (t3) { t3.is_completed = false; t3.completed_at = null; t3.updated_at = now; }
          });
          render();
          entry.ids.forEach(function(id) { patch(id, { is_completed: false, completed_at: null, updated_at: now }).catch(function(){}); });
          toast('Undone: ' + entry.ids.length + ' tasks restored');
        }
      } catch(e) { toast('Undo failed'); }
    };

    // Keyboard shortcut: Cmd+Z
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        var active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        window.undoLast();
      }
    });
