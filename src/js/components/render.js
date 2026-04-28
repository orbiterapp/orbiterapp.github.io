    function visible() {
      var t = new Date(); t.setHours(0, 0, 0, 0);
      var base;
      if (showArchived) {
        base = tasks.filter(function (x) { return x.is_completed; });
        if (searchQuery) { var q = searchQuery.toLowerCase(); base = base.filter(function (x) { return x.title.toLowerCase().includes(q) || (x.notes && x.notes.toLowerCase().includes(q)) || getTagArr(x).some(function (tg) { return tg.toLowerCase().includes(q); }); }); }
        return base;
      }
      switch (currentTab) {
        case 'inbox': base = tasks.filter(function (x) {
          if (x.is_completed || x.parent_id) return false;
          if (x.defer_date) { var _dd = new Date(x.defer_date); _dd.setHours(0,0,0,0); if (_dd > t) return false; }
          return true;
        }); break;
        case 'calendar':
          var startD = new Date(calSelectedDate); startD.setHours(0, 0, 0, 0);
          var endD = new Date(startD.getTime() + 864e5);
          var isActualToday = startD.getTime() === (new Date().setHours(0, 0, 0, 0));
          var startStr = calSelectedDate.getFullYear() + '-' + String(calSelectedDate.getMonth() + 1).padStart(2, '0') + '-' + String(calSelectedDate.getDate()).padStart(2, '0');
          base = tasks.filter(function (x) {
            if (x.is_completed || x.parent_id) return false;
            if (calView === 'today' && x.is_today_task) return true;
            if (isActualToday && x.is_today_task) return true;
            if (!x.due_date) return false;
            return x.due_date.substring(0, 10) === startStr;
          });
          break;
        case 'flagged': base = tasks.filter(function (x) { return !x.is_completed && x.is_flagged && !x.parent_id; }); break;
        case 'projects':
          base = currentProjectFilter
            ? tasks.filter(function (x) { return !x.is_completed && x.project_id === currentProjectFilter; })
            : tasks.filter(function (x) { return !x.is_completed && !!x.project_id; });
          break;
        case 'all': base = tasks.filter(function (x) { return !x.is_completed && !x.parent_id; }); break;
        default: base = [];
      }
      if (searchQuery) { var q = searchQuery.toLowerCase(); base = base.filter(function (x) { return x.title.toLowerCase().includes(q) || (x.notes && x.notes.toLowerCase().includes(q)) || getTagArr(x).some(function (tg) { return tg.toLowerCase().includes(q); }); }); }
      // Smart filters
      if (activeFilters.priority) { base = base.filter(function (x) { return x.priority === activeFilters.priority; }); }
      if (activeFilters.tag) { base = base.filter(function (x) { return getTagArr(x).indexOf(activeFilters.tag) !== -1; }); }
      if (activeFilters.due) {
        if (activeFilters.due === 'overdue') base = base.filter(function (x) { if (!x.due_date) return false; return new Date(x.due_date) < t; });
        else if (activeFilters.due === 'today') base = base.filter(function (x) { if (!x.due_date) return false; var d = new Date(x.due_date); return d >= t && d < new Date(t.getTime() + 864e5); });
        else if (activeFilters.due === 'week') base = base.filter(function (x) { if (!x.due_date) return false; var d = new Date(x.due_date); return d >= t && d < new Date(t.getTime() + 7 * 864e5); });
        else if (activeFilters.due === 'nodate') base = base.filter(function (x) { return !x.due_date; });
      }
      if (currentTab !== 'calendar' && inboxSort !== 'created') {
        var _priOrder = { High: 0, Medium: 1, Low: 2, None: 3 };
        base = base.slice().sort(function (a, b) {
          if (inboxSort === 'due') { if (!a.due_date && !b.due_date) return 0; if (!a.due_date) return 1; if (!b.due_date) return -1; return new Date(a.due_date) - new Date(b.due_date); }
          if (inboxSort === 'priority') { return (_priOrder[a.priority] || 3) - (_priOrder[b.priority] || 3); }
          if (inboxSort === 'title') { return a.title.localeCompare(b.title); }
          return 0;
        });
      }
      return base;
    }
    function setInboxSort(val) { inboxSort = val; localStorage.setItem('inbox_sort', val); _sortOpen = false; render(); }
    var _sortOpen = false;
    var _SORT_NAMES = {created:'Date Added',due:'Due Date',priority:'Priority',title:'A–Z'};
    var _SORT_ITEMS = [['created','Date Added'],['due','Due Date'],['priority','Priority'],['title','A–Z']];
    window.toggleSortDrop = function(e) { e.stopPropagation(); _sortOpen = !_sortOpen; var d = document.getElementById('sort-drop'); if (d) d.style.display = _sortOpen ? 'block' : 'none'; };
    window.setSortAndClose = function(val) { setInboxSort(val); };
    document.addEventListener('click', function() { if (_sortOpen) { _sortOpen = false; var d = document.getElementById('sort-drop'); if (d) d.style.display = 'none'; } });


    // --- Calendar UI ---
    window.setCalView = function (view) { calView = view; if (view === 'today') { calSelectedDate = new Date(); calRefDate = new Date(); } render(); };
    window.setCalSelDate = function (y, m, d) { calSelectedDate = new Date(y, m, d); calRefDate = calView === 'month' ? new Date(y, m, 1) : new Date(y, m, d); render(); };
    window.navCalMonth = function (dir) {
      if (calView === 'week') {
        calRefDate.setDate(calRefDate.getDate() + (dir * 7));
      } else {
        calRefDate.setMonth(calRefDate.getMonth() + dir);
      }
      render();
    };
    function getCalHTML() {
      var sToday = new Date(); sToday.setHours(0, 0, 0, 0);
      var sSel = new Date(calSelectedDate); sSel.setHours(0, 0, 0, 0);

      var tabs = '<div class="cal-mode-tabs">';
      var modes = [{ id: 'today', lbl: 'Today' }, { id: 'week', lbl: 'Week' }, { id: 'month', lbl: 'Month' }];
      modes.forEach(function (m) { tabs += '<button class="cal-mode-tab' + (calView === m.id ? ' active' : '') + '" onclick="setCalView(\'' + m.id + '\')">' + m.lbl + '</button>'; });
      tabs += '</div>';

      if (calView === 'today') {
        var _dskCal = window.matchMedia('(min-width: 768px)').matches;
        if (_dskCal) {
          // Desktop: show a beautiful single-day focus card
          var _td = new Date();
          var _weekday = _td.toLocaleDateString('en-US', { weekday: 'long' });
          var _monthName = _td.toLocaleDateString('en-US', { month: 'long' });
          var _dayNum = _td.getDate();
          var _year = _td.getFullYear();
          return '<div class="cal-wrap">' + tabs
            + '<div class="today-focus-card">'
            + '<div class="today-focus-weekday">' + _weekday + '</div>'
            + '<div class="today-focus-day">' + _dayNum + '</div>'
            + '<div class="today-focus-month">' + _monthName + '</div>'
            + '<div class="today-focus-year">' + _year + '</div>'
            + '<div class="today-focus-dot"></div>'
            + '</div></div>';
        }
        return '<div class="cal-wrap" style="padding-bottom:0">' + tabs + '</div>';
      }

      var dNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      var y = calRefDate.getFullYear(), m = calRefDate.getMonth();

      var monthName = calRefDate.toLocaleString('default', { month: 'long' }) + ' ' + y;
      var head = '<div class="cal-header-row"><div class="cal-title">' + monthName + '</div><div class="cal-nav-btns"><button class="cal-nav-btn" onclick="navCalMonth(-1)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button><button class="cal-nav-btn" onclick="navCalMonth(1)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button></div></div>';

      var grid = '<div class="cal-grid" id="cal-grid-area">';
      dNames.forEach(function (n) { grid += '<div class="cal-dw">' + n + '</div>'; });

      // Compute days
      var days = [];
      if (calView === 'month') {
        var fd = new Date(y, m, 1).getDay();
        var numDays = new Date(y, m + 1, 0).getDate();
        // padding before
        var prevMax = new Date(y, m, 0).getDate();
        for (var i = fd - 1; i >= 0; i--) { days.push({ d: prevMax - i, mo: m - 1, out: true }); }
        for (var i = 1; i <= numDays; i++) { days.push({ d: i, mo: m, out: false }); }
        var len = days.length;
        for (var i = 1; len % 7 !== 0; i++) { days.push({ d: i, mo: m + 1, out: true }); len++; }
      } else if (calView === 'week') {
        var wd = calRefDate.getDay();
        var sun = new Date(calRefDate); sun.setDate(sun.getDate() - wd);
        for (var i = 0; i < 7; i++) {
          var cur = new Date(sun); cur.setDate(cur.getDate() + i);
          days.push({ d: cur.getDate(), mo: cur.getMonth(), out: false, y: cur.getFullYear() });
        }
      }

      // Pre-compute tasks per day (priority â†’ dot color)
      var td = {};
      tasks.forEach(function (t) {
        if (t.is_completed || t.parent_id || !t.due_date) return;
        var tdStr = t.due_date.split('T')[0];
        if (!td[tdStr]) td[tdStr] = [];
        td[tdStr].push(t.priority || 'low');
      });

      days.forEach(function (dy) {
        var dyY = dy.y || (dy.mo < 0 ? y - 1 : dy.mo > 11 ? y + 1 : y);
        var dyM = (dy.mo + 12) % 12;
        var dt = new Date(dyY, dyM, dy.d);
        var isT = dt.getTime() === sToday.getTime();
        var isS = dt.getTime() === sSel.getTime();
        var dtStr = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
        var dayPriorities = td[dtStr] || [];

        var cls = 'cal-day-btn';
        if (dy.out) cls += ' outside';
        if (isT) cls += ' is-today';
        if (isS) cls += ' selected';

        var dotsHtml = '';
        var _dc = dayPriorities.length;
        if (_dc > 0) {
          var _nd = Math.min(_dc, 3), _dh = '';
          for (var _di = 0; _di < _nd; _di++) _dh += '<div class="cal-dot"></div>';
          dotsHtml = '<div class="cal-dots">' + _dh + '</div>';
        }

        grid += '<div class="cal-cell"><button class="' + cls + '" onclick="setCalSelDate(' + dyY + ',' + dyM + ',' + dy.d + ')">' + dy.d + '</button>' + dotsHtml + '</div>';
      });
      grid += '</div>';

      return '<div class="cal-wrap" id="cal-wrap-box">' + tabs + head + grid + '</div>';
    }

    function bindCalTouch() { }
    function render() {
      var v = visible();
      var area = document.getElementById('task-area');
      // Header
      var _ds = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (showArchived) {
        document.getElementById('persp-title').textContent = 'Archive';
        var badge = document.getElementById('persp-badge'); badge.style.background = 'none'; badge.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>';
      } else {
        var tab = TABS[currentTab] || TABS['inbox'];
        document.getElementById('persp-title').textContent = tab.label;
        var badge = document.getElementById('persp-badge'); badge.style.background = tab.bg; badge.style.color = tab.color; badge.innerHTML = tab.icon;
      }
      var _countText = searchQuery ? v.length + ' result' + (v.length !== 1 ? 's' : '') : (v.length === 0 ? (showArchived ? 'No archived tasks' : 'No tasks') : v.length + ' ' + (showArchived ? 'archived' : 'task') + (v.length !== 1 ? 's' : ''));
      document.getElementById('persp-count').textContent = _ds + ' · ' + _countText;
      // Tab highlights
      document.querySelectorAll('.tb-btn').forEach(function (b) { b.classList.remove('active'); });
      if (!showArchived) {
        var tbEl = document.getElementById('tb-' + currentTab);
        if (tbEl) { tbEl.classList.add('active'); tbEl.querySelector('.tb-icon').style.color = tab.color; tbEl.querySelector('.tb-label').style.color = tab.color; }
      }
      document.querySelectorAll('.tb-btn:not(.active)').forEach(function (b) { var ic = b.querySelector('.tb-icon'), lb = b.querySelector('.tb-label'); if (ic) ic.style.color = ''; if (lb) lb.style.color = ''; });
      if (typeof window._lgPillPlace === 'function') window._lgPillPlace(currentTab);
      // All tab badges
      var t = new Date(); t.setHours(0, 0, 0, 0);
      var inboxN = tasks.filter(function (x) { return !x.is_completed && !x.parent_id; }).length;
      var todayN = tasks.filter(function (x) { if (x.is_completed) return false; if (x.is_today_task) return true; if (!x.due_date) return false; var d = new Date(x.due_date); return d >= t && d < new Date(t.getTime() + 864e5); }).length;
      var flagN = tasks.filter(function (x) { return !x.is_completed && x.is_flagged; }).length;
      var bg = document.getElementById('badge-inbox'); bg.textContent = inboxN > 99 ? '99+' : inboxN; bg.style.display = inboxN > 0 ? 'flex' : 'none';
      var bt = document.getElementById('badge-calendar'); bt.textContent = todayN > 99 ? '99+' : todayN; bt.style.display = todayN > 0 ? 'flex' : 'none';
      var bf = document.getElementById('badge-flagged'); bf.textContent = flagN > 99 ? '99+' : flagN; bf.style.display = flagN > 0 ? 'flex' : 'none';
      // Filter chips
      renderFilterChips();
      // Project filter pills
      var pfb = document.getElementById('project-filter-bar');
      if (currentTab === 'projects') {
        pfb.style.display = 'flex';
        var pills = '<div class="proj-pill' + (currentProjectFilter === null ? ' active' : '') + '" onclick="setProjectFilter(null)" style="color:var(--green)"><span class="proj-dot" style="background:var(--green)"></span>All</div>';
        projects.forEach(function (p) {
          var active = currentProjectFilter === p.id;
          pills += '<div class="proj-pill' + (active ? ' active' : '') + '" onclick="setProjectFilter(\'' + p.id + '\')" style="color:' + p.color + '"><span class="proj-dot" style="background:' + p.color + '"></span>' + esc(p.name) + '</div>';
        });
        if (projects.length === 0) pills += '<div class="proj-pill" onclick="openProjectsModal()" style="color:var(--text3)">+ Create project</div>';
        pfb.innerHTML = pills;
      } else { pfb.style.display = 'none'; }
      if (v.length === 0) {
        // ORB-67: Per-perspective empty state copy
        var EMPTY_COPY_TAB = { inbox: ["You're all caught up", "New tasks land here. Tap + to capture."], calendar: ["No tasks today", "Nothing scheduled. Tap + to add one."], flagged: ["Nothing flagged", "Flag important tasks to surface them here."], projects: ["No tasks", "Add tasks to keep your project moving."], all: ["All clear", "Your task list is empty."] };
        var _ec = !searchQuery && EMPTY_COPY_TAB[currentTab];
        var emptyMsg = searchQuery ? 'No results' : (_ec ? _ec[0] : 'Nothing here');
        var emptySub = searchQuery ? 'Try a different search' : (_ec ? _ec[1] : 'Tap + to add a task');
        var emptyHTML = '<div class="empty-state"><div class="empty-icon">' + EMPTY_ICONS[currentTab] + '</div><div class="empty-label">' + emptyMsg + '</div><div class="empty-sub">' + emptySub + '</div></div>';
        if (currentTab === 'calendar') {
          var _dsk = window.matchMedia('(min-width: 768px)').matches;
          var _selLabel = calSelectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          if (_dsk) {
            var _calInfo = '<div class="cal-selected-info"><div class="cal-selected-date">' + _selLabel + '</div><div class="cal-selected-count">No tasks scheduled</div></div>';
            var _noTasksHtml = '<div class="cal-split-right-title">Tasks for ' + calSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</div><div class="empty-state"><div class="empty-icon">' + EMPTY_ICONS['calendar'] + '</div><div class="empty-label">No tasks</div><div class="empty-sub">Nothing scheduled for this day</div></div>';
            area.innerHTML = '<div class="cal-split-layout"><div class="cal-split-left">' + getCalHTML() + _calInfo + '</div><div class="cal-split-right">' + _noTasksHtml + '</div></div>';
          } else {
            area.innerHTML = getCalHTML() + emptyHTML;
          }
          setTimeout(bindCalTouch, 100);
        }
        else { area.innerHTML = emptyHTML; }
        updateAppBadge(); return;
      }
      updateAppBadge();
      var _nowDay = new Date(); _nowDay.setHours(0, 0, 0, 0);
      var _overdue = [], _reg = [];
      if (currentTab === 'inbox') {
        v.forEach(function (t) { if (t.due_date && new Date(t.due_date) < _nowDay && !t.is_completed) _overdue.push(t); else _reg.push(t); });
      } else { _reg = v; }
      if (currentTab === 'calendar') {
        _reg.sort(function (a, b) {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
      }
      // Build per-render lookup caches to avoid O(n²) linear searches
      var _projMap = {}; projects.forEach(function(p) { _projMap[p.id] = p; });
      var _tagColorMap = {}; getAllTags().forEach(function(tg) { _tagColorMap[tg.name] = tg.color; });
      function _mkRow(t, i) {
        var due = fmtDue(t.due_date), pc = pClass(t.priority), chips = '';
        var tags = getTagArr(t);
        var proj = t.project_id ? (_projMap[t.project_id] || null) : null;
        var subtasks = getSubtasks(t.id);
        var doneSubs = subtasks.filter(function (s) { return s.is_completed; }).length;
        var fTagColor = tags.length ? (_tagColorMap[tags[0]] || null) : null;
        if (t.is_flagged) chips += '<span class="chip chip-flag"><svg width="10" height="10" viewBox="0 0 24 24" fill="var(--pink)" stroke="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/></svg>Flag</span>';
        if (t.defer_date) { var _df = new Date(t.defer_date); _df.setHours(0,0,0,0); if (_df > _nowDay) chips += '<span class="chip chip-defer" style="color:var(--text3)"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Defer ' + _df.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + '</span>'; }
        if (due) chips += '<span class="chip ' + due.cls + '">' + due.text + '</span>';
        if (t.priority && t.priority !== 'None') chips += '<span class="chip chip-priority cp-' + t.priority.toLowerCase() + '">' + t.priority + '</span>';
        if (t.repeat_rule && t.repeat_rule !== 'None') chips += '<span class="chip chip-repeat"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:2px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>' + t.repeat_rule + '</span>';
        if (subtasks.length > 0) chips += '<span class="chip chip-note"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:2px"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' + doneSubs + '/' + subtasks.length + '</span>';
        if (proj && currentTab !== 'projects') chips += '<span class="chip chip-project"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + proj.color + ';margin-right:3px"></span>' + esc(proj.name) + '</span>';
        tags.forEach(function (tag) { var color = _tagColorMap[tag] || 'var(--text2)'; chips += '<span class="chip chip-tag" style="background:' + color + '22;color:' + color + '">' + esc(tag) + '</span>'; });
        if (t.notes) chips += '<span class="chip chip-note">Note</span>';
        var archCls = showArchived ? ' archived-row' : '';
        var msSel = _msMode && _msIds.has(t.id) ? ' ms-selected' : '';
        var dragH = (showArchived || _msMode) ? '' : '<div class="drag-handle" draggable="true" data-id="' + t.id + '" ontouchstart="event.stopPropagation()"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg></div>';
        var chkBtn;
        if (_msMode) {
          var isChecked = _msIds.has(t.id);
          chkBtn = '<button class="ms-chk' + (isChecked ? ' checked' : '') + '" onclick="event.stopPropagation();toggleMsRow(\'' + t.id + '\',event)">' + (isChecked ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</button>';
        } else if (showArchived) {
          var _archSel = _archiveSelected.has(t.id);
          chkBtn = '<button class="chk' + (_archSel ? ' p-high' : '') + '" style="' + (_archSel ? 'border-color:var(--accent);background:var(--accent-dim)' : '') + '" onclick="event.stopPropagation();toggleArchiveRow(\'' + t.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + (_archSel ? 'var(--accent)' : 'var(--green)') + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>';
        } else {
          chkBtn = '<button class="chk ' + pc + '" onclick="event.stopPropagation();completeTask(\'' + t.id + '\')"></button>';
        }
        var _accent = fTagColor ? 'border-left:3px solid ' + fTagColor + ';padding-left:10px;' : '';
        var _todayBtn = (showArchived || _msMode) ? '' : (t.is_today_task ? '<span class="row-today-indicator" title="In Today">â˜€</span>' : '<button class="row-today-btn" onclick="event.stopPropagation();markAsToday(\'' + t.id + '\')" title="Add to Today">â˜€</button>');
        var _trashBtn = (showArchived || _msMode) ? '' : '<button class="row-del-btn" onclick="event.stopPropagation();quickDeleteTask(\'' + t.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        var _rowClick = _msMode ? 'toggleMsRow(\'' + t.id + '\',event)' : 'openTaskDetail(\'' + t.id + '\')';
        return '<div class="task-row clickable' + archCls + msSel + '" id="task-' + t.id + '" data-sort="' + i + '" style="' + _accent + 'animation-delay:' + Math.min(i * 0.03, 0.3) + 's" onclick="' + _rowClick + '" oncontextmenu="event.preventDefault();showCtxMenu(event,\'' + t.id + '\')" data-longpress="' + t.id + '">' + dragH + chkBtn + '<div class="task-body"><div class="task-name">' + esc(t.title) + '</div>' + (chips ? '<div class="task-chips">' + chips + '</div>' : '') + '</div>' + _todayBtn + _trashBtn + '</div>';
      }
      var _allRows = [];
      if (_overdue.length) { _allRows.push({ type: 'header', label: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Overdue (' + _overdue.length + ')', cls: 'overdue-header' }); _overdue.forEach(function(t,i){ _allRows.push({type:'task',t,i}); }); _allRows.push({ type: 'header', label: tab.label, cls: '' }); }
      _reg.forEach(function(t,i){ _allRows.push({type:'task',t,i:i+_overdue.length}); });
      var _limited = _allRows.slice(0, _renderLimit), _hasMore = _allRows.length > _renderLimit;
      var _rHtml = _limited.map(function(r){ return r.type === 'header' ? '<div class="section-header ' + r.cls + '">' + r.label + '</div>' : _mkRow(r.t, r.i); }).join('');
      if (_hasMore) _rHtml += '<div id="vscroll-sentinel" style="height:40px;display:flex;align-items:center;justify-content:center"><button onclick="_renderLimit+=50;render()" style="background:var(--surface2);color:var(--text2);border:1px solid var(--border);border-radius:8px;padding:6px 16px;font-size:13px;cursor:pointer">Load more (' + (_allRows.length - _renderLimit) + ' remaining)</button></div>';
      if (currentTab === 'calendar') {
        var _dsk = window.matchMedia('(min-width: 768px)').matches;
        var _selLabel = calSelectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        var _taskCount = v.length;
        if (_dsk) {
          var _calInfo = '<div class="cal-selected-info"><div class="cal-selected-date">' + _selLabel + '</div><div class="cal-selected-count">' + _taskCount + ' task' + (_taskCount !== 1 ? 's' : '') + '</div></div>';
          var _rightTitle = '<div class="cal-split-right-title">Tasks for ' + calSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</div>';
          area.innerHTML = '<div class="cal-split-layout"><div class="cal-split-left">' + getCalHTML() + _calInfo + '</div><div class="cal-split-right">' + _rightTitle + _rHtml + '</div></div>';
        } else {
          area.innerHTML = getCalHTML() + _rHtml;
        }
        setTimeout(bindCalTouch, 100);
      } else {
        if (showArchived) {
          var _archBar = '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px 4px;flex-wrap:wrap">';
          if (_archiveSelected.size > 0) {
            _archBar += '<button onclick="restoreArchiveSelected()" style="background:var(--green-dim);color:var(--green);border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer">Restore ' + _archiveSelected.size + '</button>';
            _archBar += '<button onclick="deleteArchiveSelected()" style="background:var(--red-dim);color:var(--red);border:none;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer">Delete ' + _archiveSelected.size + '</button>';
            _archBar += '<button onclick="_archiveSelected.clear();render()" style="background:var(--surface2);color:var(--text2);border:none;border-radius:8px;padding:5px 12px;font-size:12px;cursor:pointer">Clear</button>';
          }
          if (v.length > 0) {
            var _allSel = v.every(function(t) { return _archiveSelected.has(t.id); });
            _archBar += '<button onclick="' + (_allSel ? '_archiveSelected.clear()' : 'v.forEach(function(t){_archiveSelected.add(t.id)})') + ';render()" style="margin-left:auto;background:none;color:var(--text3);border:1px solid var(--border);border-radius:8px;padding:5px 12px;font-size:12px;cursor:pointer">' + (_allSel ? 'Deselect all' : 'Select all') + '</button>';
          }
          _archBar += '</div>';
          area.innerHTML = _archBar + _rHtml;
        } else {
          var _sBarHtml = '<div class="sort-bar"><div style="position:relative"><button class="sort-btn" onclick="toggleSortDrop(event)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg>' + (_SORT_NAMES[inboxSort]||'Sort') + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg></button><div id="sort-drop" class="sort-drop" style="display:none">' + _SORT_ITEMS.map(function(s){return'<button class="sort-drop-item'+(inboxSort===s[0]?' active':'')+'" onclick="setSortAndClose(\''+s[0]+'\')">'+s[1]+'</button>';}).join('') + '</div></div></div>';
          area.innerHTML = _sBarHtml + _rHtml;
        }
      }
    } // end render()


    function setProjectFilter(id) { currentProjectFilter = id; render(); }

    // â”€â”€â”€ Sync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async function fetchProjects() {
      try {
        var r = await api('projects?order=name.asc');
        var data = await r.json();
        if (Array.isArray(data)) {
          projects = data.map(function (p) { return { id: p.id, name: p.name, color: p.color || '#8b5cf6', is_completed: !!p.is_completed, completed_at: p.completed_at || null }; });
          // ORB-30: persist to localStorage so quick.html can read project list
          localStorage.setItem('pwa_projects', JSON.stringify(projects));
        }
      } catch (e) { /* projects already loaded from localStorage on init */ }
    }
    function showSkeleton() {
      var area = document.getElementById('task-area');
      if (!area || tasks.length > 0) return; // only on first load
      var html = '';
      for (var i = 0; i < 6; i++) {
        var w = ['long','med','long','short','med','long'][i];
        html += '<div class="skeleton-row"><div class="skel-circle"></div><div class="skel-lines"><div class="skel-line '+w+'"></div><div class="skel-line short"></div></div></div>';
      }
      area.innerHTML = html;
    }
    async function syncTasks() { if (syncing) return; syncing = true; var _sb = document.getElementById('sync-btn'); if (_sb) _sb.classList.add('spinning'); var _us = document.getElementById('um-sync'); if (_us) _us.style.opacity = '.4'; showSkeleton(); try { tasks = await fetchAll(); await fetchProjects(); populateProjectSelects(); render(); } catch (e) { if (e.message !== 'Unauthorized') toast('Sync failed'); } finally { syncing = false; if (_sb) _sb.classList.remove('spinning'); if (_us) _us.style.opacity = ''; } }

    // â”€â”€â”€ ORB-37: Supabase Realtime subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var _realtimeChannel = null, _rtClient = null, _rtRenderTimer = null, _rtReconnectTimer = null;
    function _rtRender() { clearTimeout(_rtRenderTimer); _rtRenderTimer = setTimeout(render, 300); }
    function initRealtime() {
      if (!session || !window.supabase) return;
      if (_realtimeChannel) return;
      clearTimeout(_rtReconnectTimer);
      _rtClient = window.supabase.createClient(SB_URL, SB_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      _rtClient.realtime.setAuth(session.access_token);
      _realtimeChannel = _rtClient
        .channel('tasks-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: 'user_id=eq.' + session.user.id
        }, function(payload) {
          if (payload.eventType === 'INSERT') {
            if (!tasks.find(function(t) { return t.id === payload.new.id; })) { tasks.push(payload.new); _rtRender(); }
          } else if (payload.eventType === 'UPDATE') {
            var idx = tasks.findIndex(function(t) { return t.id === payload.new.id; });
            if (idx !== -1) { Object.assign(tasks[idx], payload.new); } else { tasks.push(payload.new); }
            _rtRender();
          } else if (payload.eventType === 'DELETE') {
            tasks = tasks.filter(function(t) { return t.id !== payload.old.id; });
            _rtRender();
          }
        })
        .subscribe(function(status) {
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            _realtimeChannel = null;
            _rtReconnectTimer = setTimeout(initRealtime, 8000);
          }
        });
      window.addEventListener('beforeunload', function() {
        if (_rtClient && _realtimeChannel) _rtClient.removeChannel(_realtimeChannel);
      });
    }

    // â”€â”€â”€ Complete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ORB-85: Calculate the next due date for recurring tasks.
    function calculateNextDueDate(baseDateISO, rule) {
      var base = new Date(baseDateISO);
      switch (rule) {
        case 'Daily': base.setDate(base.getDate() + 1); break;
        case 'Weekly': base.setDate(base.getDate() + 7); break;
        case 'Biweekly': base.setDate(base.getDate() + 14); break;
        case 'Monthly': base.setMonth(base.getMonth() + 1); break;
        case 'Yearly': base.setFullYear(base.getFullYear() + 1); break;
        default: break;
      }
      return toLocalDateTimeValue(base);
    }

    async function completeTask(id) {
      var el = document.getElementById('task-' + id), task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      haptic('success');
      if (el) { var cb = el.querySelector('.chk'); if (cb) { cb.classList.add('check-anim'); cb.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'; cb.style.borderColor = 'var(--green)'; cb.style.background = 'var(--green-dim)'; } setTimeout(function () { el.classList.add('completing'); }, 180); }
      // ORB-83: pill label must say "Done", not "Archived"
      var _snapshot = Object.assign({}, task);
      toast('Done', 3500, function () {
        clearTimeout(window._completeDelay);
        task.is_completed = false;
        task.completed_at = null;
        patch(task.id, { is_completed: false, completed_at: null, updated_at: new Date().toISOString() }).catch(function () { });
        if (task._next_instance_id) {
          deleteTask(task._next_instance_id).catch(function () { });
          tasks = tasks.filter(function (t) { return t.id !== task._next_instance_id; });
          task._next_instance_id = null;
        }
        render();
        toast('Restored âœ“');
      });
      window._completeDelay = setTimeout(function () {
        task.is_completed = true; task.completed_at = new Date().toISOString(); task.updated_at = new Date().toISOString();
        if (task.repeat_rule && task.repeat_rule !== 'None') {
          var anchorISO = task.due_date || toLocalDateTimeValue(new Date());
          var nextDue = calculateNextDueDate(anchorISO, task.repeat_rule);
          var now = new Date().toISOString();
          var nextTask = Object.assign({}, _snapshot, {
            id: uuid(),
            due_date: nextDue,
            is_completed: false,
            completed_at: null,
            created_at: now,
            updated_at: now
          });
          task._next_instance_id = nextTask.id;
          tasks.push(nextTask);
          upsert(nextTask).catch(function () { });
        }
        render();
        markDone(task).catch(function () { task.is_completed = false; task.completed_at = null; render(); toast('Failed to sync'); });
      }, 480);
    }

    // â”€â”€â”€ Tags picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function buildTagsPicker(containerId, selectedArr, filterStr) {
      var container = document.getElementById(containerId);
      var allTags = getAllTags();
      var q = (filterStr || '').toLowerCase();
      var filtered = q ? allTags.filter(function(t){ return t.name.toLowerCase().includes(q); }) : allTags;
      var tagHtml = filtered.map(function (tag) {
        var sel = selectedArr.indexOf(tag.name) !== -1;
        return '<div class="tag-opt' + (sel ? ' selected' : '') + '" style="color:' + tag.color + (sel ? ';background:' + tag.color + '22;border-color:' + tag.color : '') + '" onclick="toggleTagOpt(\'' + containerId + '\',\'' + tag.name + '\')"><span class="tag-dot" style="background:' + tag.color + '"></span>' + tag.name + '</div>';
      }).join('');
      var inputHtml = '<input id="' + containerId + '-search" type="text" placeholder="Filter tags…" value="' + esc(filterStr||'') + '" oninput="buildTagsPicker(\'' + containerId + '\',' + (containerId==='i-tags-picker'?'addModalTags':'detailModalTags') + ',this.value)" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:12px;color:var(--text);margin-bottom:6px;box-sizing:border-box" autocomplete="off">';
      container.innerHTML = inputHtml + tagHtml;
    }
    function toggleTagOpt(containerId, tagName) {
      var arr = containerId === 'i-tags-picker' ? addModalTags : detailModalTags;
      var idx = arr.indexOf(tagName);
      if (idx === -1) arr.push(tagName); else arr.splice(idx, 1);
      var searchEl = document.getElementById(containerId + '-search');
      buildTagsPicker(containerId, arr, searchEl ? searchEl.value : '');
    }

    // â”€â”€â”€ Project selects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function populateProjectSelects() {
      ['i-project', 'd-project', 'ddp-project'].forEach(function (id) {
        var sel = document.getElementById(id);
        if (!sel) return;
        var current = sel.value;
        sel.innerHTML = '<option value="">No Project</option>' + projects.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('');
        if (current) sel.value = current;
      });
    }

    // â”€â”€â”€ Add Task Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function switchTab(tab) { currentTab = tab; if (tab !== 'projects') currentProjectFilter = null; if (showArchived) { showArchived = false; document.getElementById('archive-label').textContent = 'View Archive'; } _renderLimit = 50; clearSearch(); render(); }
    function updateTitleCount(inp) {
      var rem = 255 - inp.value.length;
      var el = document.getElementById('i-title-count');
      if (el) { el.style.display = rem <= 20 ? 'inline' : 'none'; el.textContent = rem + ' left'; el.style.color = rem <= 5 ? 'var(--red)' : 'var(--muted)'; }
    }
    function updateNotesCount(inp) {
      var len = inp.value.length;
      var el = document.getElementById('i-notes-count');
      if (!el) return;
      if (len >= 1000) { el.style.display = 'inline'; el.textContent = len.toLocaleString() + ' chars'; el.style.color = len >= 2000 ? 'var(--red)' : 'var(--muted)'; }
      else { el.style.display = 'none'; }
    }

