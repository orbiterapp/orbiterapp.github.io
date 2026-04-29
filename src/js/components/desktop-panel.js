    function openDesktopDetailPanel(taskId) {
      var task = tasks.find(function(t) { return t.id === taskId; });
      if (!task) return;
      currentTaskId = taskId;
      document.getElementById('ddp-title-input').value = task.title || '';
      document.getElementById('ddp-notes').value = task.notes || '';
      document.getElementById('ddp-priority').value = task.priority || 'None';
      document.getElementById('ddp-due').value = task.due_date ? task.due_date.split('T')[0] : '';
      var dueT = task.due_date && task.due_date.includes('T') ? task.due_date.split('T')[1] : '';
      document.getElementById('ddp-due-time').value = dueT ? dueT.substring(0,5) === '00:00' ? '' : dueT.substring(0,5) : '';
      var ddpNb = document.getElementById('ddp-notify-before'); if (ddpNb) ddpNb.value = String(task.notify_before_minutes != null ? task.notify_before_minutes : 30);
      document.getElementById('ddp-repeat').value = task.repeat_rule || 'None';
      var ddpEn = document.getElementById('ddp-energy'); if (ddpEn) ddpEn.value = task.energy_level || '';
      var ddpEm = document.getElementById('ddp-est-mins'); if (ddpEm) ddpEm.value = task.estimated_minutes || '';
      ddpFlag = task.is_flagged || false;
      ddpToday = task.is_today_task || false;
      document.getElementById('ddp-tog-flag').classList.toggle('on', ddpFlag);
      document.getElementById('ddp-tog-today').classList.toggle('on', ddpToday);
      // populate project select
      var ps = document.getElementById('ddp-project');
      if (ps) { ps.innerHTML = '<option value="">No Project</option>' + projects.filter(function(p){return !p.is_completed;}).map(function(p){return '<option value="'+p.id+'">'+esc(p.name)+'</option>';}).join(''); ps.value = task.project_id || ''; }
      var ddpDefer = document.getElementById('ddp-defer'); if (ddpDefer) ddpDefer.value = task.defer_date ? task.defer_date.split('T')[0] : '';
      var ddpTagsPicker = document.getElementById('ddp-tags-picker');
      if (ddpTagsPicker) { detailModalTags = getTagArr(task); buildTagsPicker('ddp-tags-picker', detailModalTags); }
      renderDdpSubtasks();
      document.getElementById('desktop-detail-panel').classList.add('open');
      document.getElementById('screen-app').classList.add('detail-open');
    }
    function closeDesktopDetailPanel() {
      document.getElementById('desktop-detail-panel').classList.remove('open');
      document.getElementById('screen-app').classList.remove('detail-open');
      currentTaskId = null;
    }
    function toggleDdpFlag() { ddpFlag = !ddpFlag; document.getElementById('ddp-tog-flag').classList.toggle('on', ddpFlag); }
    function toggleDdpToday() { ddpToday = !ddpToday; document.getElementById('ddp-tog-today').classList.toggle('on', ddpToday); }
    function saveDdpDetails() {
      var task = tasks.find(function(t) { return t.id === currentTaskId; });
      if (!task) return;
      var title = document.getElementById('ddp-title-input').value.trim();
      if (!title) { toast('Title required'); return; }
      var dueVal = document.getElementById('ddp-due').value;
      var dueTimeVal = document.getElementById('ddp-due-time').value;
      var dueISO = combineLocalDateTime(dueVal, dueTimeVal);
      var now = new Date().toISOString();
      task.title = title;
      task.notes = document.getElementById('ddp-notes').value.trim();
      task.priority = document.getElementById('ddp-priority').value;
      task.due_date = dueISO;
      task.repeat_rule = document.getElementById('ddp-repeat').value || 'None';
      task.energy_level = (document.getElementById('ddp-energy') || {}).value || null;
      task.estimated_minutes = parseInt((document.getElementById('ddp-est-mins') || {}).value) || null;
      task.project_id = document.getElementById('ddp-project').value || null;
      task.defer_date = (document.getElementById('ddp-defer') || {}).value || null;
      task.tag_ids = JSON.stringify(detailModalTags.map(function(tn){ return {name:tn,color:getTagColor(tn)}; }));
      task.is_flagged = ddpFlag;
      task.is_today_task = ddpToday;
      task.notify_before_minutes = parseInt((document.getElementById('ddp-notify-before') || {}).value) || 30;
      task.notified_at = null;
      task.updated_at = now;
      render();
      patch(task.id, { title:task.title, notes:task.notes, priority:task.priority, due_date:task.due_date, defer_date:task.defer_date, repeat_rule:task.repeat_rule, project_id:task.project_id, tag_ids:task.tag_ids, is_flagged:task.is_flagged, is_today_task:task.is_today_task, notify_before_minutes:task.notify_before_minutes, energy_level:task.energy_level, estimated_minutes:task.estimated_minutes, notified_at:null, updated_at:now }).then(function(){ toast('Saved'); }).catch(function(){ toast('Sync failed'); });
    }
    function deleteDdpTask() {
      var id = currentTaskId;
      if (!id) return;
      if (shouldConfirmDelete()) {
        closeDesktopDetailPanel();
        currentTaskId = id;
        document.getElementById('delete-modal-bg').classList.add('open');
      } else {
        closeDesktopDetailPanel();
        quickDeleteTask(id);
      }
    }

    // â"€â"€â"€ DDP Subtasks â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    function renderDdpSubtasks() {
      if (!currentTaskId) return;
      var subtasks = getSubtasks(currentTaskId);
      var list = document.getElementById('ddp-subtasks-list');
      var label = document.getElementById('ddp-subtasks-title-label');
      if (!list || !label) return;
      var done = subtasks.filter(function(s) { return s.is_completed; }).length;
      label.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Subtasks' + (subtasks.length > 0 ? ' (' + done + '/' + subtasks.length + ')' : '');
      list.innerHTML = subtasks.map(function(s) {
        return '<div class="subtask-item"><button class="subtask-chk' + (s.is_completed ? ' checked' : '') + '" onclick="toggleDdpSubtask(\'' + s.id + '\')">' + (s.is_completed ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</button><span class="subtask-title' + (s.is_completed ? ' done' : '') + '" onclick="toggleDdpSubtask(\'' + s.id + '\')">' + esc(s.title) + '</span><button class="del-sub-btn" onclick="deleteDdpSubtask(\'' + s.id + '\')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
      }).join('');
    }
    function showDdpSubtaskInput() {
      document.getElementById('ddp-subtask-input-row').style.display = 'flex';
      document.getElementById('ddp-new-subtask-input').focus();
    }
    function confirmAddDdpSubtask() {
      var input = document.getElementById('ddp-new-subtask-input');
      var title = input.value.trim(); if (!title) return;
      var subtasks = getSubtasks(currentTaskId);
      var now = new Date().toISOString();
      var task = { id: uuid(), user_id: session.user.id, title: title, notes: '', due_date: null, defer_date: null, is_completed: false, is_flagged: false, priority: 'None', project_id: null, tag_ids: '[]', created_at: now, completed_at: null, repeat_rule: 'None', parent_id: currentTaskId, sort_order: subtasks.length, last_reviewed: null, next_review_date: null, review_frequency_num: null, review_frequency_unit: null, is_in_review: false, is_today_task: false, updated_at: now };
      tasks.push(task);
      upsert(task).catch(function() { toast('Failed to sync'); });
      input.value = '';
      document.getElementById('ddp-subtask-input-row').style.display = 'none';
      renderDdpSubtasks(); render();
    }
    function toggleDdpSubtask(id) {
      var task = tasks.find(function(t) { return t.id === id; }); if (!task) return;
      task.is_completed = !task.is_completed;
      task.completed_at = task.is_completed ? new Date().toISOString() : null;
      task.updated_at = new Date().toISOString();
      patch(task.id, { is_completed: task.is_completed, completed_at: task.completed_at, updated_at: task.updated_at }).catch(function() { toast('Sync failed'); });
      renderDdpSubtasks(); render();
    }
    function deleteDdpSubtask(id) {
      haptic('medium');
      var backup = tasks.find(function(t) { return t.id === id; }); if (!backup) return;
      backup = Object.assign({}, backup);
      tasks = tasks.filter(function(t) { return t.id !== id; });
      deleteTask(id).catch(function() {});
      renderDdpSubtasks(); render();
      toast('Subtask deleted', 3500, function() { tasks.push(backup); upsert(backup).catch(function(){}); renderDdpSubtasks(); render(); toast('Restored'); });
    }
    document.getElementById('ddp-new-subtask-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmAddDdpSubtask(); });

    // â"€â"€â"€ Subtasks â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
