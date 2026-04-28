    // â"€â"€â"€ Context Menu (long-press + right-click) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    (function () {
      var _ctx = null, _tid = null, _lpTimer = null;
      var menu = document.createElement('div');
      menu.id = 'ctx-menu';
      menu.style.cssText = 'position:fixed;z-index:600;background:var(--card2);border:1px solid var(--border2);border-radius:16px;padding:6px;min-width:220px;box-shadow:0 16px 48px rgba(0,0,0,.4);display:none;overflow:hidden;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)';
      menu.innerHTML = '';
      document.body.appendChild(menu);
      function closeCtx() { menu.classList.remove('open'); _tid = null; }
      document.addEventListener('click', function (e) { if (!e.target.closest('#ctx-menu')) closeCtx(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          closeCtx();
          if (_msMode) { exitMsMode(); return; }
          var ddp = document.getElementById('desktop-detail-panel');
          if (ddp && ddp.classList.contains('open')) { saveDdpDetails(); closeDesktopDetailPanel(); return; }
          var dm = document.getElementById('detail-modal-bg');
          if (dm && dm.classList.contains('open')) { saveTaskDetails(); closeDetailModal(); return; }
        }
        if (e.key === '?' && !e.target.closest('input,textarea,select')) { showShortcutsModal(); }
        if (!e.target.closest('input,textarea,select')) {
          if (e.key === 'n') { e.preventDefault(); openModal(); }
          if (e.key === '/') { e.preventDefault(); var s = document.getElementById('search-input'); if (s) s.focus(); }
          if (e.key === '1') switchTab('inbox');
          if (e.key === '2') switchTab('calendar');
          if (e.key === '3') switchTab('flagged');
          if (e.key === '4') switchTab('projects');
        }
      });
      window.showCtxMenu = function (e, id) {
        _tid = id;
        var task = tasks.find(function (t) { return t.id === id; });
        if (!task) return;
        var items = [
          { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>', label: 'Mark Complete', fn: function () { closeCtx(); completeTask(id); } },
          { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pink)" stroke-width="2.5" stroke-linecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>', label: task.is_flagged ? 'Unflag' : 'Flag', fn: function () { closeCtx(); task.is_flagged = !task.is_flagged; task.updated_at = new Date().toISOString(); render(); upsert(task).then(function () { toast(task.is_flagged ? 'Flagged' : 'Unflagged'); }).catch(function () { toast('Sync failed'); }); } },
          { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label: task.is_today_task ? 'Remove from Today' : 'Add to Today', fn: function () { closeCtx(); task.is_today_task = !task.is_today_task; task.updated_at = new Date().toISOString(); render(); upsert(task).then(function () { toast(task.is_today_task ? 'Added to Today' : 'Removed from Today'); }).catch(function () { toast('Sync failed'); }); } },
          { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>', label: 'Clone…', fn: function () { closeCtx(); showCloneModal(id); } },
          { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>', label: 'Delete', fn: function () { closeCtx(); showDeleteConfirm(); currentTaskId = id; }, danger: true }
        ];
        menu.innerHTML = items.map(function (it, idx) {
          return '<button class="ctx-item' + (it.danger ? ' ctx-danger' : '') + '" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;background:none;border:none;border-radius:10px;color:' + (it.danger ? 'var(--red)' : 'var(--text)') + ';font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;text-align:left" onmouseenter="this.style.background=\'var(--surface)\';" onmouseleave="this.style.background=\'none\'" data-idx="' + idx + '">' + it.icon + it.label + '</button>';
        }).join('<div style="height:1px;background:var(--border);margin:4px 8px"></div>'.replace('</button><div', '</button><div')).replace(/(<\/button>)(<button)/g, '$1<div style="height:1px;background:var(--border);margin:2px 6px"></div>$2');
        items.forEach(function (it, idx) { menu.querySelectorAll('[data-idx]')[idx].addEventListener('click', it.fn); });
        var ex = e.clientX || ((e.touches && e.touches[0] && e.touches[0].clientX) || 0);
        var ey = e.clientY || ((e.touches && e.touches[0] && e.touches[0].clientY) || 0);
        menu.classList.add('open');
        var rect = menu.getBoundingClientRect();
        var left = Math.min(ex, window.innerWidth - rect.width - 12);
        var top = Math.min(ey, window.innerHeight - rect.height - 12);
        menu.style.left = left + 'px'; menu.style.top = top + 'px';

      };
      // Long press setup
      var area = document.getElementById('task-area');
      area.addEventListener('touchstart', function (e) {
        var row = e.target.closest('.task-row');
        if (!row || e.target.closest('.chk') || e.target.closest('.drag-handle') || e.target.closest('.ms-chk')) return;
        var tid = row.id.replace('task-', '');
        _lpTimer = setTimeout(function () {
          if (_msMode) {
            toggleMsRow(tid, null);
          } else {
            enterMsMode(tid);
          }
        }, 600);
      }, { passive: true });
      area.addEventListener('touchend', function () { clearTimeout(_lpTimer); }, { passive: true });
      area.addEventListener('touchmove', function () { clearTimeout(_lpTimer); }, { passive: true });
    })();

    // â”€â”€â”€ Multi-select â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
