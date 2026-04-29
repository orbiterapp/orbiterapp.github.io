    function rowDeleteTask(id) {
      if (shouldConfirmDelete()) { currentTaskId = id; document.getElementById('delete-modal-bg').classList.add('open'); }
      else quickDeleteTask(id);
    }
    function showDeleteConfirm() {
      if (shouldConfirmDelete()) {
        document.getElementById('delete-modal-bg').classList.add('open');
      } else {
        // Skip confirmation, delete immediately
        var idToDelete = currentTaskId;
        closeDetailModal();
        if (idToDelete) quickDeleteTask(idToDelete);
      }
    }
    function closeDeleteConfirm() { document.getElementById('delete-modal-bg').classList.remove('open'); }
    function handleDeleteModalBg(e) { if (e.target.id === 'delete-modal-bg') closeDeleteConfirm(); }
    function confirmDeleteTask() {
      haptic('medium'); closeDeleteConfirm();
      var idToDelete = currentTaskId;
      closeDetailModal();
      if (!idToDelete) return;
      quickDeleteTask(idToDelete);
    }
    // ORB-55: quickDeleteTask also uses deleteTask() helper
    function quickDeleteTask(id) {
      if (!id) return;
      haptic('medium');
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      var backup = Object.assign({}, task);
      localStorage.removeItem('st_' + id);
      tasks = tasks.filter(function (t) { return t.id !== id; });
      render();
      deleteTask(id).catch(function () { });
      toast('Deleted', 3500, function () {
        tasks.push(backup);
        upsert(backup).catch(function () { });
        render();
        toast('Restored âœ"');
      });
    }

    // ORB-86: Mark task as Today (hover quick-action)
    async function markAsToday(id) {
      var task = tasks.find(function(t) { return t.id === id; });
      if (!task) return;
      haptic('light');
      var wasToday = task.is_today_task;
      task.is_today_task = !wasToday;
      task.updated_at = new Date().toISOString();
      render();
      try {
        await patch(id, { is_today_task: task.is_today_task, updated_at: task.updated_at });
        toast(task.is_today_task ? 'Added to Today' : 'Removed from Today');
      } catch(e) {
        task.is_today_task = wasToday;
        render();
        toast('Sync failed');
      }
    }

    // â"€â"€â"€ Projects â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
