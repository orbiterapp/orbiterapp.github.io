    document.addEventListener('keydown', function (e) {
      // Don't trigger in inputs
      var tag = document.activeElement.tagName;
      var inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      var cmd = e.metaKey || e.ctrlKey;
      // Escape: close modals
      if (e.key === 'Escape') {
        if (document.getElementById('detail-modal-bg').classList.contains('open')) { closeDetailModal(); e.preventDefault(); return; }
        if (document.getElementById('modal-bg').classList.contains('open')) { closeModal(); e.preventDefault(); return; }
        if (document.getElementById('delete-modal-bg').classList.contains('open')) { closeDeleteConfirm(); e.preventDefault(); return; }
        if (document.getElementById('projects-modal-bg').classList.contains('open')) { closeProjectsModal(); e.preventDefault(); return; }
        if (document.getElementById('menu-overlay').classList.contains('open')) { toggleMenu(false); e.preventDefault(); return; }
        if (showArchived) { toggleArchiveView(); e.preventDefault(); return; }
      }
      // Cmd+N or Cmd+Enter: New task
      if (cmd && (e.key === 'n' || e.key === 'N') && !inInput) { e.preventDefault(); openModal(); return; }
      // Cmd+K: Search
      if (cmd && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); toggleSearch(); return; }
      // Cmd+D: Toggle dark mode
      if (cmd && (e.key === 'd' || e.key === 'D') && !inInput) { e.preventDefault(); toggleTheme(); return; }
      // Cmd+F: Toggle filters
      if (cmd && (e.key === 'f' || e.key === 'F') && !inInput) { e.preventDefault(); toggleFilters(); return; }
      // Number keys 1-5: Switch tabs (when not in input)
      if (!inInput && !cmd && !e.altKey) {
        var tabMap = { '1': 'inbox', '2': 'calendar', '3': 'flagged', '4': 'projects', '5': 'all' };
        if (tabMap[e.key]) { if (showArchived) { showArchived = false; document.getElementById('archive-label').textContent = 'View Archive'; } switchTab(tabMap[e.key]); e.preventDefault(); return; }
        if (e.key === '6') { switchToCompleted(); e.preventDefault(); return; }
      }
      // Cmd+S: Sync
      if (cmd && (e.key === 's' || e.key === 'S')) { e.preventDefault(); syncTasks(); return; }
      // n: New task, /: Search (bare keys, no modifier, not in input)
      if (!inInput && !cmd && !e.altKey) {
        if (e.key === 'n') { e.preventDefault(); openModal(); return; }
        if (e.key === '/') { e.preventDefault(); var _si = document.getElementById('search-input'); if (_si) { toggleSearch(); _si.focus(); } return; }
        if (e.key === '?') { showShortcutsModal(); return; }
      }
    });

    // â"€â"€â"€ Drag to Reorder â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
