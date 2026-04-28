    function openProjectsModal() {
      newProjColor = PROJECT_COLORS[0];
      renderProjColorPicker();
      renderProjList();
      document.getElementById('projects-modal-bg').classList.add('open');
    }
    function closeProjectsModal() { document.getElementById('projects-modal-bg').classList.remove('open'); }
    function handleProjectsModalBg(e) { if (e.target.id === 'projects-modal-bg') closeProjectsModal(); }
    function renderProjColorPicker() {
      var cp = document.getElementById('proj-color-picker');
      cp.innerHTML = PROJECT_COLORS.map(function (c) { return '<div class="color-swatch' + (newProjColor === c ? ' selected' : '') + '" style="background:' + c + '" onclick="selectProjColor(\'' + c + '\')"></div>'; }).join('');
    }
    function selectProjColor(color) { newProjColor = color; renderProjColorPicker(); }
    function renderProjList() {
      var list = document.getElementById('proj-list');
      var active = projects.filter(function (p) { return !p.is_completed; });
      var completed = projects.filter(function (p) { return p.is_completed; });
      if (projects.length === 0) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">No projects yet</div>'; return; }
      var html = active.map(function (p) {
        var count = tasks.filter(function (t) { return !t.is_completed && t.project_id === p.id; }).length;
        return '<div class="proj-row"><span class="proj-color-dot" style="background:' + p.color + '"></span><span class="proj-row-name">' + esc(p.name) + '</span><span class="proj-row-count">' + count + ' task' + (count !== 1 ? 's' : '') + '</span><button class="proj-del-btn" onclick="completeProject(\'' + p.id + '\')" title="Complete project" style="color:var(--green)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></button><button class="proj-del-btn" onclick="deleteProject(\'' + p.id + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
      }).join('');
      if (completed.length > 0) {
        html += '<div style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:1px;text-transform:uppercase;padding:12px 0 6px">Archived</div>';
        html += completed.map(function (p) {
          return '<div class="proj-row" style="opacity:0.5"><span class="proj-color-dot" style="background:' + p.color + '"></span><span class="proj-row-name" style="text-decoration:line-through">' + esc(p.name) + '</span><button class="proj-del-btn" onclick="reopenProject(\'' + p.id + '\')" title="Reopen" style="font-size:11px;font-weight:600;color:var(--purple)">Reopen</button><button class="proj-del-btn" onclick="deleteProject(\'' + p.id + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
        }).join('');
      }
      list.innerHTML = html;
    }
    // ORB-122: Complete project — marks all active tasks and the project done
    async function completeProject(id) {
      var now = new Date().toISOString();
      var proj = projects.find(function (p) { return p.id === id; });
      if (!proj) return;
      var activeTasks = tasks.filter(function (t) { return t.project_id === id && !t.is_completed; });
      activeTasks.forEach(function (t) { t.is_completed = true; t.completed_at = now; });
      proj.is_completed = true; proj.completed_at = now;
      await Promise.allSettled(activeTasks.map(function (t) { return upsert(t); }));
      await api('projects?id=eq.' + id, { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify({ is_completed: true, completed_at: now }) }).catch(function () { });
      renderProjList(); populateProjectSelects(); render();
      toast('Project completed âœ“');
    }
    function reopenProject(id) {
      var proj = projects.find(function (p) { return p.id === id; });
      if (!proj) return;
      proj.is_completed = false; proj.completed_at = null;
      api('projects?id=eq.' + id, { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify({ is_completed: false, completed_at: null }) }).catch(function () { });
      renderProjList(); populateProjectSelects(); render();
      toast('Project reopened');
    }
    function createProject() {
      var name = document.getElementById('new-proj-name').value.trim();
      if (!name) { document.getElementById('new-proj-name').focus(); return; }
      var proj = { id: uuid(), name: name, color: newProjColor };
      projects.push(proj);
      api('projects', { method: 'POST', headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + (session?.access_token || SB_KEY), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ id: proj.id, user_id: session.user.id, name: proj.name, color: proj.color }) }).catch(function () { toast('Failed to sync project'); });
      document.getElementById('new-proj-name').value = '';
      renderProjList(); populateProjectSelects(); render();
      toast('Project created');
    }
    function deleteProject(id) {
      var backupProj = projects.find(function (p) { return p.id === id; });
      var affectedCount = tasks.filter(function (t) { return t.project_id === id && !t.is_completed; }).length;
      projects = projects.filter(function (p) { return p.id !== id; });
      api('projects?id=eq.' + id, { method: 'DELETE', headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + (session?.access_token || SB_KEY), 'Prefer': 'return=minimal' } }).catch(function () { toast('Failed to sync project'); });
      // Remove project_id from tasks that used it
      var affectedTaskIds = [];
      tasks.forEach(function (t) { if (t.project_id === id) { affectedTaskIds.push(t.id); t.project_id = null; upsert(t).catch(function () { }); } });
      var prevFilter = currentProjectFilter;
      if (currentProjectFilter === id) currentProjectFilter = null;
      renderProjList(); populateProjectSelects(); render();
      var msg = affectedCount > 0 ? 'Project deleted (' + affectedCount + ' task' + (affectedCount !== 1 ? 's' : '') + ' unlinked)' : 'Project deleted';
      toast(msg, 4000, function () {
        if (backupProj) projects.push(backupProj);
        api('projects', { method: 'POST', headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + (session?.access_token || SB_KEY), 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(backupProj) }).catch(function () { });
        affectedTaskIds.forEach(function (tid) {
          var t = tasks.find(function (x) { return x.id === tid; });
          if (t) { t.project_id = id; upsert(t).catch(function () { }); }
        });
        currentProjectFilter = prevFilter;
        renderProjList(); populateProjectSelects(); render();
        toast('Restored âœ“');
      });
    }

    // ORB-121: Tag management
    const TAG_COLORS_PRESET = ['#8b5cf6','#22d3ee','#f59e0b','#34d399','#6089f5','#f43f7a','#fb923c','#ef4444'];
