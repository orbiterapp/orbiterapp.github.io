    function openModal() {
      flagged = false; addModalTags = [];
      ['i-title', 'i-notes'].forEach(function (id) { document.getElementById(id).value = ''; });
      var tc = document.getElementById('i-title-count'); if (tc) tc.style.display = 'none';
      var nc = document.getElementById('i-notes-count'); if (nc) nc.style.display = 'none';
      document.getElementById('i-priority').value = 'None';
      document.getElementById('i-due').value = '';
      document.getElementById('i-due-time').value = '';
      document.getElementById('i-repeat').value = 'None';
      document.getElementById('i-project').value = '';
      document.getElementById('tog-flag').classList.remove('on');
      populateProjectSelects();
      buildTagsPicker('i-tags-picker', addModalTags);
      var strip = document.getElementById('i-nlp-strip'); if (strip) { strip.style.display = 'none'; strip.innerHTML = ''; }
      document.getElementById('modal-bg').classList.add('open');
      var p = document.getElementById('add-more-opts'), b = document.getElementById('add-more-opts-btn'); if (p && p.classList.contains('open')) { p.classList.remove('open'); if (b) b.classList.remove('open'); }
      setTimeout(function () { document.getElementById('i-title').focus(); _bindNLPInput(); }, 350);
    }
    function toggleAddMoreOpts() { var p = document.getElementById('add-more-opts'), b = document.getElementById('add-more-opts-btn'); if (p.classList.contains('open')) { p.classList.remove('open'); b.classList.remove('open'); } else { p.classList.add('open'); b.classList.add('open'); } }
    function closeModal() { document.getElementById('modal-bg').classList.remove('open'); }
    function handleModalBg(e) { if (e.target.id === 'modal-bg') closeModal(); }
    function toggleFlag() { flagged = !flagged; document.getElementById('tog-flag').classList.toggle('on', flagged); }

    async function addTask() {
      var rawTitle = document.getElementById('i-title').value.trim();
      if (!rawTitle) { document.getElementById('i-title').focus(); return; }
      var nlp = parseNLPWeb(rawTitle);
      var title = nlp ? nlp.title : rawTitle;
      var now = new Date().toISOString();
      var dueDate = document.getElementById('i-due').value, dueTime = document.getElementById('i-due-time').value;
      var dueISO = combineLocalDateTime(dueDate, dueTime);
      if (nlp && nlp.dueDate) dueISO = nlp.dueDate;
      var pri = document.getElementById('i-priority').value;
      if (nlp && nlp.priority !== 'None') pri = nlp.priority;
      var isFlag = flagged; if (nlp && nlp.isFlagged) isFlag = true;
      var projId = document.getElementById('i-project').value || null; if (nlp && nlp.projectId) projId = nlp.projectId;
      var taskTags = addModalTags.slice(); if (nlp && nlp.tagNames) nlp.tagNames.forEach(function (tn) { if (!taskTags.includes(tn)) taskTags.push(tn); });
      var deferISO = null; if (nlp && nlp.deferDate) deferISO = nlp.deferDate;
      var energyLevel = (nlp && nlp.energy !== 'None') ? nlp.energy : null;
      var estMins = (nlp && nlp.estimatedMinutes) ? nlp.estimatedMinutes : null;
      var task = { id: uuid(), user_id: session.user.id, title: title, notes: document.getElementById('i-notes').value.trim(), due_date: dueISO, defer_date: deferISO, is_completed: false, is_flagged: isFlag, priority: pri, project_id: projId, tag_ids: JSON.stringify(taskTags.map(function (tn) { return { name: tn, color: getTagColor(tn) }; })), energy_level: energyLevel, estimated_minutes: estMins, created_at: now, completed_at: null, repeat_rule: document.getElementById('i-repeat').value || 'None', parent_id: null, sort_order: tasks.length, last_reviewed: null, next_review_date: null, review_frequency_num: null, review_frequency_unit: null, is_in_review: false, is_today_task: false, notify_before_minutes: parseInt(document.getElementById('i-notify-before').value) || 30, notified_at: null, updated_at: now };
      tasks.push(task); render(); haptic('medium');
      var addAnother = document.getElementById('tog-add-another')?.classList.contains('on');
      if (addAnother) {
        ['i-title','i-notes'].forEach(function(id){document.getElementById(id).value='';});
        document.getElementById('i-priority').value='None'; document.getElementById('i-due').value=''; document.getElementById('i-due-time').value=''; document.getElementById('i-repeat').value='None'; document.getElementById('i-notify-before').value='30';
        flagged=false; addModalTags=[]; document.getElementById('tog-flag').classList.remove('on'); buildTagsPicker('i-tags-picker',addModalTags);
        var strip=document.getElementById('i-nlp-strip'); if(strip){strip.style.display='none';strip.innerHTML='';}
        setTimeout(function(){document.getElementById('i-title').focus();},100);
        toast('Task added âœ“');
      } else { closeModal(); toast('Task added'); }
      _queueOffline({ type: 'upsert', task: task });
      try { await upsert(task); _dequeueOffline(task.id); } catch (e) { toast('Failed to sync'); }
    }

    // â”€â”€â”€ Task Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let currentTaskId = null;
