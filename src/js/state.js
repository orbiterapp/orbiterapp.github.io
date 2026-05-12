    let session = null, tasks = [], currentTab = 'inbox', flagged = false, detailToday = false, syncing = false;
    let calRefDate = new Date(), calSelectedDate = new Date(), calView = localStorage.getItem('cal_view') || 'month';
    let searchQuery = '', currentProjectFilter = null;
    let showArchived = false;
    let _archiveSelected = new Set();
    let _renderLimit = 50;
    let activeFilters = { priority: null, due: null, tag: null }; // smart filters
    var inboxSort = localStorage.getItem('inbox_sort') || 'created';

    // â"€â"€â"€ Projects (localStorage) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    let projects = [];

    const PROJECT_COLORS = ['#8b5cf6', '#22d3ee', '#f43f7a', '#f59e0b', '#34d399', '#6089f5', '#fb923c', '#a78bfa'];
    let newProjColor = PROJECT_COLORS[0];

    // â"€â"€â"€ Tags â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    const PRESET_TAGS = [
      { name: 'Work', color: '#8b5cf6' },
      { name: 'Personal', color: '#22d3ee' },
      { name: 'Errands', color: '#f59e0b' },
      { name: 'Health', color: '#34d399' },
      { name: 'Finance', color: '#6089f5' },
      { name: 'Home', color: '#f43f7a' },
      { name: 'Learning', color: '#fb923c' }
    ];
    // Per-modal selected tags
    let addModalTags = [], detailModalTags = [];

    // â"€â"€â"€ Subtasks (localStorage keyed by task ID) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    function getSubtasks(taskId) { return tasks.filter(function (t) { return t.parent_id === taskId; }).sort(function (a, b) { return a.sort_order - b.sort_order; }); }



    // â"€â"€â"€ Tabs config â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    const TABS = {
      inbox:    { label: 'Inbox',     color: 'var(--p-inbox)',    icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>', bg: 'color-mix(in srgb, var(--p-inbox) 14%, transparent)', tabColor: 'var(--p-inbox)' },
      calendar: { label: 'Calendar',  color: 'var(--p-calendar)', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', bg: 'color-mix(in srgb, var(--p-calendar) 14%, transparent)', tabColor: 'var(--p-calendar)' },
      flagged:  { label: 'Flagged',   color: 'var(--p-flagged)',  icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4a2 2 0 0 1 2-2h13l-3 5 3 5H6"/></svg>', bg: 'color-mix(in srgb, var(--p-flagged) 14%, transparent)', tabColor: 'var(--p-flagged)' },
      projects: { label: 'Projects',  color: 'var(--p-projects)', icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', bg: 'color-mix(in srgb, var(--p-projects) 14%, transparent)', tabColor: 'var(--p-projects)' },
      all:      { label: 'All Tasks', color: 'var(--p-done)',     icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"/><path d="M8 12h9"/><path d="M8 18h5"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>', bg: 'color-mix(in srgb, var(--p-done) 14%, transparent)', tabColor: 'var(--p-done)' }
    };

    const EMPTY_ICONS = {
      inbox: '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
      calendar: '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      flagged: '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
      projects: '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      all: '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
    };

    // â"€â"€â"€ Auth â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
