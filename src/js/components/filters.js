    function renderActiveFilterBadge() { var fBtn = document.getElementById('filter-btn'); if (fBtn) fBtn.classList.toggle('filter-active', !!hasActiveFilters()); }
    function toggleFilters() {
      var panel = document.getElementById('filter-panel');
      var btn = document.getElementById('filter-btn');
      var isOpen = panel.classList.contains('open');
      if (isOpen) { panel.classList.remove('open'); btn.classList.remove('active-btn'); clearFilters(); }
      else { panel.classList.add('open'); btn.classList.add('active-btn'); }
    }
    var _savedFilters = (function() { try { return JSON.parse(localStorage.getItem('orbiter_saved_filters') || '[]'); } catch { return []; } })();
    function _persistSavedFilters() { try { localStorage.setItem('orbiter_saved_filters', JSON.stringify(_savedFilters)); } catch { } }
    function saveFilterSet() {
      if (!hasActiveFilters()) return;
      var saveChip = document.querySelector('#filter-chips .filter-chip[onclick*="saveFilterSet"]');
      if (!saveChip) return;
      var wrap = document.createElement('span');
      wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px';
      var inp = document.createElement('input');
      inp.type = 'text'; inp.placeholder = 'Filter name…';
      inp.style.cssText = 'font-size:12px;padding:3px 7px;border-radius:8px;border:1px solid var(--accent);background:var(--surface2);color:var(--text);font-family:inherit;width:120px;outline:none';
      var btn = document.createElement('button');
      btn.textContent = 'Save';
      btn.style.cssText = 'font-size:12px;padding:3px 8px;border-radius:8px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-family:inherit;font-weight:600';
      wrap.appendChild(inp); wrap.appendChild(btn);
      saveChip.replaceWith(wrap);
      inp.focus();
      function doSave() {
        var name = inp.value.trim(); if (!name) { inp.focus(); return; }
        _savedFilters = _savedFilters.filter(function (f) { return f.name !== name; });
        _savedFilters.push({ name: name, filters: Object.assign({}, activeFilters) });
        _persistSavedFilters(); render(); toast('Filter saved: ' + name);
      }
      btn.addEventListener('click', doSave);
      inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); doSave(); } if (e.key === 'Escape') { render(); } });
    }
    function applySavedFilter(name) {
      var fs = _savedFilters.find(function (f) { return f.name === name; });
      if (!fs) return;
      activeFilters = Object.assign({}, fs.filters); render(); renderActiveFilterBadge();
    }
    function deleteSavedFilter(name) {
      _savedFilters = _savedFilters.filter(function (f) { return f.name !== name; });
      _persistSavedFilters(); render(); toast('Filter deleted');
    }
    function clearFilters() { activeFilters = { priority: null, due: null, tag: null }; render(); renderActiveFilterBadge(); }
    function setFilter(type, val) {
      if (activeFilters[type] === val) activeFilters[type] = null; else activeFilters[type] = val;
      _renderLimit = 50; render();
    }
    function renderFilterChips() {
      var c = document.getElementById('filter-chips');
      if (!c) return;
      var h = '';
      // Priority filters
      ['High', 'Medium', 'Low'].forEach(function (p) {
        var colors = { High: 'var(--red)', Medium: 'var(--amber)', Low: 'var(--cyan)' };
        h += '<div class="filter-chip' + (activeFilters.priority === p ? ' active' : '') + '" onclick="setFilter(\'priority\',\'' + p + '\')" style="' + (activeFilters.priority === p ? 'border-color:' + colors[p] + ';color:' + colors[p] + ';background:' + colors[p] + '18' : '') + '">' + p + '</div>';
      });
      h += '<div style="width:1px;height:20px;background:var(--border);margin:0 2px"></div>';
      // Due date filters
      var dues = [['overdue', 'Overdue'], ['today', 'Due Today'], ['week', 'This Week'], ['nodate', 'No Date']];
      dues.forEach(function (d) {
        h += '<div class="filter-chip' + (activeFilters.due === d[0] ? ' active' : '') + '" onclick="setFilter(\'due\',\'' + d[0] + '\')">' + d[1] + '</div>';
      });
      // Tag filters (show on second row) — use all tags, not just presets
      var _allFilterTags = getAllTags();
      var hasTagFilters = _allFilterTags.length > 0;
      if (hasTagFilters) {
        h += '<div style="width:100%"></div>';
        _allFilterTags.forEach(function (tag) {
          var sel = activeFilters.tag === tag.name;
          h += '<div class="filter-chip' + (sel ? ' active' : '') + '" onclick="setFilter(\'tag\',\'' + tag.name + '\')" style="' + (sel ? 'border-color:' + tag.color + ';color:' + tag.color + ';background:' + tag.color + '18' : '') + '"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + tag.color + '"></span>' + tag.name + '</div>';
        });
      }
      // Saved filter sets
      if (_savedFilters.length > 0 || hasActiveFilters()) {
        h += '<div style="width:100%"></div>';
        h += '<div style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--text2)">Saved:</div>';
        _savedFilters.forEach(function (fs) {
          h += '<div class="filter-chip" style="background:var(--accent-dim);color:var(--accent);border-color:var(--accent)" onclick="applySavedFilter(' + JSON.stringify(fs.name) + ')">' + esc(fs.name) + '<span onclick="event.stopPropagation();deleteSavedFilter(' + JSON.stringify(fs.name) + ')" style="margin-left:4px;opacity:.6;cursor:pointer">×</span></div>';
        });
        if (hasActiveFilters()) h += '<div class="filter-chip" onclick="saveFilterSet()" style="border-style:dashed">+ Save</div>';
      }
      c.innerHTML = h;
    }
    function hasActiveFilters() { return activeFilters.priority || activeFilters.due || activeFilters.tag; }

    // â”€â”€â”€ Archive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
