    (function () {
      var area = document.getElementById('task-area');
      var dragId = null, placeholder = null, dragEl = null;
      // Touch-based drag
      var dStartY = 0, dOffsetY = 0, dActive = false;
      area.addEventListener('touchstart', function (e) {
        var handle = e.target.closest('.drag-handle');
        if (!handle) return;
        e.preventDefault();
        dragId = handle.dataset.id;
        dragEl = handle.closest('.task-row');
        if (!dragEl) return;
        dStartY = e.touches[0].clientY;
        var rect = dragEl.getBoundingClientRect();
        dOffsetY = dStartY - rect.top;
        dragEl.classList.add('dragging');
        dActive = true;
        haptic('light');
      }, { passive: false });
      area.addEventListener('touchmove', function (e) {
        if (!dActive || !dragEl) return;
        e.preventDefault();
        var rows = Array.from(area.querySelectorAll('.task-row:not(.dragging)'));
        var cy = e.touches[0].clientY;
        // Find closest row to insert before
        var closest = null, closestDist = Infinity;
        rows.forEach(function (r) {
          var rect = r.getBoundingClientRect();
          var mid = rect.top + rect.height / 2;
          var dist = cy - mid;
          if (dist > 0 && dist < closestDist) { closestDist = dist; closest = r; }
        });
        // Remove existing placeholders
        area.querySelectorAll('.drag-placeholder').forEach(function (p) { p.remove(); });
        if (closest && closest.nextSibling) {
          var ph = document.createElement('div'); ph.className = 'drag-placeholder';
          closest.parentNode.insertBefore(ph, closest.nextSibling);
        }
      }, { passive: false });
      area.addEventListener('touchend', function (e) {
        if (!dActive || !dragEl) return;
        dActive = false; dragEl.classList.remove('dragging');
        area.querySelectorAll('.drag-placeholder').forEach(function (p) { p.remove(); });
        // Reorder based on final position
        var rows = Array.from(area.querySelectorAll('.task-row'));
        var ids = rows.map(function (r) { return r.id.replace('task-', ''); });
        var changed = [];
        ids.forEach(function (id, i) {
          var task = tasks.find(function (t) { return t.id === id; });
          if (task && task.sort_order !== i) { task.sort_order = i; changed.push(task); }
          else if (task) task.sort_order = i;
        });
        dragId = null; dragEl = null;
        render();
        changed.forEach(function (t) { patch(t.id, { sort_order: t.sort_order, updated_at: new Date().toISOString() }).catch(function(){}); });
      });
      // HTML5 drag for desktop
      area.addEventListener('dragstart', function (e) {
        var handle = e.target.closest('.drag-handle');
        if (!handle) return;
        dragId = handle.dataset.id;
        dragEl = handle.closest('.task-row');
        if (dragEl) dragEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragId);
      });
      area.addEventListener('dragover', function (e) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        var row = e.target.closest('.task-row');
        area.querySelectorAll('.drag-placeholder').forEach(function (p) { p.remove(); });
        if (row && row !== dragEl) {
          var rect = row.getBoundingClientRect();
          var mid = rect.top + rect.height / 2;
          var ph = document.createElement('div'); ph.className = 'drag-placeholder';
          if (e.clientY < mid) row.parentNode.insertBefore(ph, row);
          else if (row.nextSibling) row.parentNode.insertBefore(ph, row.nextSibling);
          else row.parentNode.appendChild(ph);
        }
      });
      area.addEventListener('drop', function (e) {
        e.preventDefault();
        area.querySelectorAll('.drag-placeholder').forEach(function (p) { p.remove(); });
        if (dragEl) dragEl.classList.remove('dragging');
        var rows = Array.from(area.querySelectorAll('.task-row'));
        var ids = rows.map(function (r) { return r.id.replace('task-', ''); });
        var changed2 = [];
        ids.forEach(function (id, i) { var task = tasks.find(function (t) { return t.id === id; }); if (task && task.sort_order !== i) { task.sort_order = i; changed2.push(task); } else if (task) task.sort_order = i; });
        dragId = null; dragEl = null;
        render();
        changed2.forEach(function (t) { patch(t.id, { sort_order: t.sort_order, updated_at: new Date().toISOString() }).catch(function(){}); });
      });
      area.addEventListener('dragend', function () {
        if (dragEl) dragEl.classList.remove('dragging');
        area.querySelectorAll('.drag-placeholder').forEach(function (p) { p.remove(); });
        dragId = null; dragEl = null;
      });
    })();

