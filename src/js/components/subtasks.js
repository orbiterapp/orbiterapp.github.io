    function renderSubtasks() {
      if (!currentTaskId) return;
      var subtasks = getSubtasks(currentTaskId);
      var list = document.getElementById('subtasks-list');
      var label = document.getElementById('subtasks-title-label');
      var done = subtasks.filter(function (s) { return s.is_completed; }).length;
      label.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Subtasks' + (subtasks.length > 0 ? ' (' + done + '/' + subtasks.length + ')' : '');
      list.innerHTML = subtasks.map(function (s) {
        return '<div class="subtask-item"><button class="subtask-chk' + (s.is_completed ? ' checked' : '') + '" onclick="toggleSubtask(\'' + s.id + '\')">' + (s.is_completed ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</button><span class="subtask-title' + (s.is_completed ? ' done' : '') + '" onclick="toggleSubtask(\'' + s.id + '\')">' + esc(s.title) + '</span><button class="del-sub-btn" onclick="deleteSubtask(\'' + s.id + '\')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
      }).join('');
    }
    function showSubtaskInput() {
      document.getElementById('subtask-input-row').style.display = 'flex';
      document.getElementById('new-subtask-input').focus();
    }
    function confirmAddSubtask() {
      var input = document.getElementById('new-subtask-input');
      var title = input.value.trim();
      if (!title) return;
      var subtasks = getSubtasks(currentTaskId);
      var now = new Date().toISOString();
      var task = { id: uuid(), user_id: session.user.id, title: title, notes: '', due_date: null, defer_date: null, is_completed: false, is_flagged: false, priority: 'None', project_id: null, tag_ids: '[]', created_at: now, completed_at: null, repeat_rule: 'None', parent_id: currentTaskId, sort_order: subtasks.length, last_reviewed: null, next_review_date: null, review_frequency_num: null, review_frequency_unit: null, is_in_review: false, is_today_task: false, updated_at: now };
      tasks.push(task);
      upsert(task).catch(function () { toast('Failed to sync'); });
      input.value = '';
      document.getElementById('subtask-input-row').style.display = 'none';
      renderSubtasks(); render();
    }
    function toggleSubtask(id) {
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      task.is_completed = !task.is_completed;
      if (task.is_completed) task.completed_at = new Date().toISOString();
      else task.completed_at = null;
      task.updated_at = new Date().toISOString();
      upsert(task).catch(function () { toast('Failed to sync'); });
      renderSubtasks(); render();
    }
    function deleteSubtask(id) {
      haptic('medium');
      var backup = tasks.find(function (t) { return t.id === id; });
      if (!backup) return;
      backup = Object.assign({}, backup);
      tasks = tasks.filter(function (t) { return t.id !== id; });
      // ORB-55: use deleteTask() which goes through the proper merged-header api() path
      deleteTask(id).catch(function () { toast('Failed to sync'); });
      renderSubtasks(); render();
      toast('Subtask deleted', 3500, function () {
        tasks.push(backup);
        upsert(backup).catch(function () { });
        renderSubtasks(); render();
        toast('Restored âœ"');
      });
    }
    document.getElementById('new-subtask-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') confirmAddSubtask(); });

    // â"€â"€â"€ Delete â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    // ORB-87: Show confirmation modal only if user enabled the setting
