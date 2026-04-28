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

    // â”€â”€â”€ Subtasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
