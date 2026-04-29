    function openTaskDetail(taskId) {
      // ORB-79: Use right panel on desktop, bottom sheet modal on mobile
      if (window.matchMedia('(min-width: 768px)').matches) {
        openDesktopDetailPanel(taskId);
        return;
      }
      var task = tasks.find(function (t) { return t.id === taskId; });
      if (!task) return;
      currentTaskId = taskId;
      document.getElementById('d-title').value = task.title || '';
      document.getElementById('d-notes').value = task.notes || '';
      document.getElementById('d-priority').value = task.priority || 'None';
      document.getElementById('d-due').value = task.due_date ? task.due_date.split('T')[0] : '';
      var dueT = task.due_date && task.due_date.includes('T') ? task.due_date.split('T')[1] : '';
      if (dueT) { var hm = dueT.substring(0, 5); document.getElementById('d-due-time').value = (hm === '00:00' ? '' : hm); } else { document.getElementById('d-due-time').value = ''; }
      document.getElementById('d-defer').value = task.defer_date ? task.defer_date.split('T')[0] : '';
      document.getElementById('d-notify-before').value = String(task.notify_before_minutes != null ? task.notify_before_minutes : 30);
      document.getElementById('d-repeat').value = task.repeat_rule || 'None';
      document.getElementById('d-est-mins').value = task.estimated_minutes || '';
      flagged = task.is_flagged || false;
      detailToday = task.is_today_task || false;
      document.getElementById('d-tog-flag').classList.toggle('on', flagged);
      document.getElementById('d-tog-today').classList.toggle('on', detailToday);
      detailModalTags = getTagArr(task);
      populateProjectSelects();
      document.getElementById('d-project').value = task.project_id || '';
      buildTagsPicker('d-tags-picker', detailModalTags);
      renderSubtasks();
      document.getElementById('detail-modal-bg').classList.add('open');
      setTimeout(function () { document.getElementById('d-title').focus(); }, 350);
    }
    function closeDetailModal() { document.getElementById('detail-modal-bg').classList.remove('open'); currentTaskId = null; }
    function handleDetailModalBg(e) { if (e.target.id === 'detail-modal-bg') closeDetailModal(); }
    function showShortcutsModal() { document.getElementById('shortcuts-modal-bg').classList.add('open'); }
    function hideShortcutsModal() { document.getElementById('shortcuts-modal-bg').classList.remove('open'); }

    var _cloneSourceId = null;
    function showCloneModal(id) { _cloneSourceId = id; document.getElementById('clone-modal-bg').classList.add('open'); }
    function hideCloneModal() { document.getElementById('clone-modal-bg').classList.remove('open'); _cloneSourceId = null; }
    function confirmClone(mode) {
      var src = tasks.find(function (t) { return t.id === _cloneSourceId; });
      if (!src) { hideCloneModal(); return; }
      var newDue = null;
      if (mode === 'same') { newDue = src.due_date || null; }
      else if (mode === 'today') { var d = new Date(); d.setHours(9,0,0,0); newDue = toLocalDateTimeValue(d); }
      else if (mode === 'tomorrow') { var d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); newDue = toLocalDateTimeValue(d); }
      else if (mode === 'week') { var d = src.due_date ? new Date(src.due_date) : new Date(); d.setDate(d.getDate()+7); newDue = toLocalDateTimeValue(d); }
      else if (mode === 'none') { newDue = null; }
      else if (mode === 'custom') { var v = document.getElementById('clone-custom-date').value; newDue = v ? combineLocalDateTime(v, '09:00') : null; }
      var now = new Date().toISOString();
      var dup = Object.assign({}, src, { id: uuid(), created_at: now, updated_at: now, due_date: newDue, notified_at: null, is_completed: false, completed_at: null });
      hideCloneModal();
      tasks.push(dup);
      render();
      upsert(dup).then(function () { toast('Task cloned'); }).catch(function () { toast('Sync failed'); });
    }
    function toggleDetailFlag() { flagged = !flagged; document.getElementById('d-tog-flag').classList.toggle('on', flagged); }
    function toggleDetailToday() { detailToday = !detailToday; document.getElementById('d-tog-today').classList.toggle('on', detailToday); }

    var _repeatEditPending = null;
    function saveTaskDetails() {
      var task = tasks.find(function (t) { return t.id === currentTaskId; });
      if (!task) return;
      var title = document.getElementById('d-title').value.trim();
      if (!title) { toast('Title required'); return; }
      // Show dialog if editing a repeating task
      var newRepeat = document.getElementById('d-repeat').value || 'None';
      if (task.repeat_rule && task.repeat_rule !== 'None') {
        _repeatEditPending = currentTaskId;
        document.getElementById('repeat-edit-modal-bg').classList.add('open');
        return;
      }
      _doSaveDetails(task);
    }
    function confirmRepeatEdit(mode) {
      document.getElementById('repeat-edit-modal-bg').classList.remove('open');
      var task = tasks.find(function (t) { return t.id === _repeatEditPending; });
      _repeatEditPending = null;
      if (!task) return;
      if (mode === 'one') {
        // Detach: create standalone copy with edits, complete original's current cycle
        var now = new Date().toISOString();
        var copy = Object.assign({}, task, { id: uuid(), created_at: now, updated_at: now, repeat_rule: 'None', notified_at: null });
        _applyFormToTask(copy);
        copy.repeat_rule = 'None';
        tasks.push(copy);
        render();
        upsert(copy).then(function(){ toast('Saved as one-time task'); }).catch(function(){ toast('Sync failed'); });
        closeDetailModal();
      } else {
        _doSaveDetails(task);
      }
    }
    function cancelRepeatEdit() {
      document.getElementById('repeat-edit-modal-bg').classList.remove('open');
      _repeatEditPending = null;
    }
    function _applyFormToTask(task) {
      var dueVal = document.getElementById('d-due').value;
      var dueTimeVal = document.getElementById('d-due-time').value;
      var deferVal = document.getElementById('d-defer').value;
      var now = new Date().toISOString();
      task.title = document.getElementById('d-title').value.trim();
      task.notes = document.getElementById('d-notes').value.trim();
      task.priority = document.getElementById('d-priority').value;
      task.due_date = combineLocalDateTime(dueVal, dueTimeVal);
      task.defer_date = deferVal || null;
      task.repeat_rule = document.getElementById('d-repeat').value || 'None';
      task.estimated_minutes = parseInt(document.getElementById('d-est-mins').value) || null;
      task.project_id = document.getElementById('d-project').value || null;
      task.tag_ids = JSON.stringify(detailModalTags.map(function(tn){ return {name:tn,color:getTagColor(tn)}; }));
      task.is_flagged = flagged;
      task.is_today_task = detailToday;
      task.notify_before_minutes = parseInt(document.getElementById('d-notify-before').value) || 30;
      task.notified_at = null;
      task.updated_at = now;
    }
    function _doSaveDetails(task) {
      _applyFormToTask(task);
      closeDetailModal();
      render();
      // ORB-82: Use PATCH (targeted update) instead of upsert POST so edits always save
      patch(task.id, {
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        due_date: task.due_date,
        defer_date: task.defer_date,
        repeat_rule: task.repeat_rule,
        project_id: task.project_id,
        tag_ids: task.tag_ids,
        is_flagged: task.is_flagged,
        is_today_task: task.is_today_task,
        notify_before_minutes: task.notify_before_minutes,
        estimated_minutes: task.estimated_minutes,
        notified_at: null,
        updated_at: task.updated_at
      }).then(function () { toast('Task updated'); }).catch(function () { toast('Failed to sync'); });
    }

    // â"€â"€â"€ ORB-79: Desktop right detail panel â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    var ddpFlag = false, ddpToday = false;
