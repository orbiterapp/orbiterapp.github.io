    // â”€â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    window.addEventListener('unhandledrejection', function (e) { console.error('Unhandled rejection:', e.reason); });
    // parseHash is kept here for the OAuth redirect case (before bootstrapSession)
    function parseHash() { const p = new URLSearchParams(window.location.hash.substring(1)); const t = p.get('access_token'), r = p.get('refresh_token'); if (!t) return null; try { const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); const pad = b + '===='.slice(b.length % 4 || 4); const d = JSON.parse(atob(pad)); if (r) localStorage.setItem('sb_refresh_token', r); return { access_token: t, user: { id: d.sub, email: d.email, user_metadata: d.user_metadata || {} } }; } catch (e) { return null; } }
    async function init() {
      try {
        // ORB-21: Use shared bootstrapSession() from auth.js
        session = await bootstrapSession();
        // Upgrade session with full user object from server (bootstrapSession may return
        // partial data from JWT hash parse or refresh token response)
        if (session) {
          try {
            var _freshUser = await fetch(SB_URL + '/auth/v1/user', { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + session.access_token } });
            if (_freshUser.ok) { var _u = await _freshUser.json(); if (_u && _u.id) session.user = _u; }
          } catch (e) {}
        }
        // Pre-load projects from localStorage for instant rendering (ORB-30)
        try { var _lsProj = localStorage.getItem('pwa_projects'); if (_lsProj) projects = JSON.parse(_lsProj); } catch (e) { }
        loadTheme();
        loadAccentColor();
        if (session) {
          updateAvatar(); populateProjectSelects();
          // ORB-69: Show onboarding on first sign-in
          if (!localStorage.getItem('orbiter_onboarded')) { show('screen-onboard'); }
          else { show('screen-app'); }
          render();
          await _flushOutbox();
          syncTasks(); loadConfirmDeleteSetting(); loadUserPreferences(); setTimeout(initRealtime, 2000);
          if ('Notification' in window && Notification.permission === 'default') { setTimeout(requestNotifPermission, 3000); }
        }
        else show('screen-login');
      } catch (e) {
        console.error('init() failed:', e);
        try { show('screen-login'); } catch (_) { }
      }
    }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.update();
      setTimeout(_syncQuietHoursToSW, 1000);
      // ORB-116: detect new SW waiting and show update banner
      reg.addEventListener('updatefound', function () {
        var newSW = reg.installing;
        newSW.addEventListener('statechange', function () {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            var b = document.getElementById('update-banner');
            if (b) {
              b.innerHTML = 'New version available — <button onclick=”applyUpdate()” style="background:none;border:none;color:inherit;font-weight:700;cursor:pointer;text-decoration:underline;font-family:inherit;font-size:inherit">Refresh</button>';
              b.style.display = 'flex';
            }
          }
        });
      });
    }).catch(function () { });
    function applyUpdate() {
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
      });
      window.location.reload();
    }

    // â”€â”€â”€ ORB-69: Onboarding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var _onboardStep = 0;
    function onboardNext() {
      _onboardStep++;
      if (_onboardStep >= 3) { completeOnboarding(); return; }
      document.getElementById('onboard-track').style.transform = 'translateX(-' + (_onboardStep * 100) + '%)';
      [0,1,2].forEach(function(i) {
        var d = document.getElementById('odot-' + i);
        d.classList.toggle('active', i === _onboardStep);
        d.style.width = i === _onboardStep ? '22px' : '';
      });
      if (_onboardStep === 2) document.getElementById('onboard-next-btn').textContent = 'Get Started';
    }
    function completeOnboarding() {
      localStorage.setItem('orbiter_onboarded', '1');
      show('screen-app');
    }

    // â”€â”€â”€ Desktop Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var _isDesktop = window.matchMedia('(min-width: 768px)');
    function buildDesktopSidebar() {
      if (document.getElementById('desktop-sidebar')) return;
      var sb = document.createElement('div');
      sb.id = 'desktop-sidebar';
      sb.className = 'desktop-sidebar';
      sb.innerHTML = '<div class="ds-brand"><img src="iconbg.png" class="ds-brand-logo" alt=""><span class="ds-brand-name">Orbiter</span></div>'
        + '<div class="ds-nav" id="ds-nav"></div>'
        + '<button class="ds-new-btn" onclick="openModal()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New Task</button>'
        + '<div class="ds-footer" id="ds-footer" onclick="toggleMenu()"></div>';
      document.body.insertBefore(sb, document.body.firstChild);
    }
    function removeDesktopSidebar() {
      var sb = document.getElementById('desktop-sidebar');
      if (sb) sb.remove();
    }
    function renderDesktopSidebar() {
      if (!_isDesktop.matches) return;
      var nav = document.getElementById('ds-nav');
      if (!nav) return;
      var tabs = [
        { id: 'inbox', label: 'Inbox', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>' },
        { id: 'calendar', label: 'Calendar', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
        { id: 'flagged', label: 'Flagged', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>' },
        { id: 'projects', label: 'Projects', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' }
      ];
      var t = new Date(); t.setHours(0, 0, 0, 0);
      var inboxN = tasks.filter(function (x) { return !x.is_completed && !x.parent_id; }).length;
      var todayN = tasks.filter(function (x) { if (x.is_completed) return false; if (x.is_today_task) return true; if (!x.due_date) return false; var d = new Date(x.due_date); return d >= t && d < new Date(t.getTime() + 864e5); }).length;
      var flagN = tasks.filter(function (x) { return !x.is_completed && x.is_flagged; }).length;
      var badgeCounts = { inbox: inboxN, calendar: todayN, flagged: flagN, projects: 0 };
      var colors = { inbox: 'var(--purple)', calendar: 'var(--cyan)', flagged: 'var(--pink)', projects: 'var(--green)' };
      var h = '';
      tabs.forEach(function (tab) {
        var isActive = currentTab === tab.id && !showArchived;
        var badge = badgeCounts[tab.id];
        var iconColor = isActive ? colors[tab.id] : 'currentColor';
        var iconHtml = tab.icon.replace('stroke="currentColor"', 'stroke="' + iconColor + '"');
        h += '<button class="ds-tab' + (isActive ? ' active' : '') + '" onclick="switchTab(\'' + tab.id + '\')" style="' + (isActive ? 'color:' + colors[tab.id] : '') + '"><span class="ds-icon">' + iconHtml + '</span>' + tab.label + (badge > 0 ? '<span class="ds-badge">' + (badge > 99 ? '99+' : badge) + '</span>' : '') + '</button>';
      });
      // Utility section
      h += '<div class="ds-section-label">Utilities</div>';
      h += '<button class="ds-tab' + (showArchived ? ' active' : '') + '" onclick="toggleArchiveView()" style="' + (showArchived ? 'color:var(--text2)' : '') + '"><span class="ds-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg></span>' + (showArchived ? 'Back to Tasks' : 'Archive') + '</button>';
      h += '<button class="ds-tab" onclick="toggleTheme()"><span class="ds-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span><span id="ds-theme-label">' + (document.body.classList.contains('light') ? 'Dark Mode' : 'Light Mode') + '</span></button>';
      h += '<button class="ds-tab" onclick="syncTasks()"><span class="ds-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></span>Sync</button>';
      nav.innerHTML = h;
      // Footer (user info)
      var footer = document.getElementById('ds-footer');
      if (footer) {
        var m = session?.user?.user_metadata || {}, e = session?.user?.email || '', n = m.full_name || m.name || e.split('@')[0] || '?';
        var initials = n.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
        var avatarUrl = m.avatar_url || m.picture;
        footer.innerHTML = '<div class="ds-footer-avatar">' + (avatarUrl ? '<img src="' + esc(avatarUrl) + '" alt="">' : initials) + '</div><div class="ds-footer-info"><div class="ds-footer-name">' + esc(n) + '</div><div class="ds-footer-email">' + esc(e) + '</div></div>';
        var mn = document.getElementById('m-name'); if (mn) mn.textContent = n;
        var me = document.getElementById('m-email'); if (me) me.textContent = e;
      }
    }
    // ORB-81: Debounce render via requestAnimationFrame so rapid successive calls
    // (e.g. badge update + sidebar update + task list) coalesce into a single DOM paint.
    var _origRender = render;
    var _renderPending = false;
    render = function () {
      if (_renderPending) return;
      _renderPending = true;
      requestAnimationFrame(function () {
        _renderPending = false;
        _origRender();
        if (_isDesktop.matches) renderDesktopSidebar();
      });
    };
    // Patch toggleTheme to update sidebar label
    var _origToggleTheme = toggleTheme;
    toggleTheme = function () {
      _origToggleTheme();
      var label = document.getElementById('ds-theme-label');
      if (label) label.textContent = document.body.classList.contains('light') ? 'Dark Mode' : 'Light Mode';
    };
    // Build/tear down on resize
    function handleDesktopChange(mq) {
      if (mq.matches) { buildDesktopSidebar(); renderDesktopSidebar(); }
      else { removeDesktopSidebar(); }
    }
    _isDesktop.addEventListener('change', handleDesktopChange);
    // Initial build if already desktop
    if (_isDesktop.matches && session) {
      buildDesktopSidebar();
      // Delay to ensure render has happened
      setTimeout(renderDesktopSidebar, 100);
    }
    // Also build sidebar when screen-app is shown
    var _origShow = show;
    show = function (id) {
      _origShow(id);
      if (id === 'screen-app' && _isDesktop.matches) {
        buildDesktopSidebar();
        setTimeout(renderDesktopSidebar, 50);
      } else if (id !== 'screen-app') {
        removeDesktopSidebar();
      }
    };

    // â”€â”€â”€ Disable Zoom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

    // â”€â”€â”€ Liquid Glass Pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    (function () {
      var pill = null, toolbar = null, _placed = false;
      var SPRING = 'left .42s cubic-bezier(.34,1.56,.64,1),width .42s cubic-bezier(.34,1.56,.64,1),top .38s cubic-bezier(.34,1.56,.64,1),height .38s cubic-bezier(.34,1.56,.64,1)';
      var NON_FAB = ['inbox', 'calendar', 'flagged', 'projects'];

      function ensure() {
        if (pill) return true;
        pill = document.getElementById('tb-pill');
        toolbar = pill && pill.closest('.toolbar');
        if (pill && toolbar) { setupDrag(); return true; }
        return false;
      }

      function getBounds(tabId) {
        var btn = document.getElementById('tb-' + tabId);
        if (!btn || !toolbar) return null;
        var tr = toolbar.getBoundingClientRect(), br = btn.getBoundingClientRect();
        return { left: br.left - tr.left, width: br.width, top: br.top - tr.top, height: br.height };
      }

      function setPillAccent(tabId) {
        if (!pill || typeof TABS === 'undefined') return;
        var tab = TABS[tabId] || TABS.inbox;
        pill.style.setProperty('--glass-accent', (tab && tab.color) || 'var(--accent)');
      }

      function placePill(tabId) {
        if (!ensure()) return;
        var b = getBounds(tabId);
        if (!b) return;
        setPillAccent(tabId);
        pill.style.transition = _placed ? SPRING : 'none';
        pill.style.left = b.left + 'px';
        pill.style.width = b.width + 'px';
        pill.style.top = (b.top - 3) + 'px';
        pill.style.height = (b.height + 6) + 'px';
        _placed = true;
      }

      function setupDrag() {
        var _dragHandled = false;

        toolbar.addEventListener('click', function (e) {
          if (_dragHandled) { _dragHandled = false; e.stopImmediatePropagation(); e.preventDefault(); }
        }, true);

        // Capture on whole toolbar — pill is pointer-events:none, bubbles up here
        toolbar.addEventListener('pointerdown', function (e) {
          if (e.target.closest('.tb-add')) return;

          var startTabId = typeof currentTab !== 'undefined' ? currentTab : 'inbox';
          var sb = getBounds(startTabId);
          if (!sb) return;

          var tr = toolbar.getBoundingClientRect();
          var baseW = sb.width;

          var moved = false;
          var lastX = e.clientX;
          var lastT = performance.now();
          var vel = 0;   // time-normalised px/ms, EMA-smoothed
          var dragTabId = startTabId;

          pill.style.transition = 'none';

          function onMove(ev) {
            var now = performance.now();
            var dt = now - lastT;
            if (dt > 0) vel = vel * 0.55 + ((ev.clientX - lastX) / dt) * 0.45;
            lastX = ev.clientX;
            lastT = now;

            if (!moved && Math.abs(ev.clientX - e.clientX) < 5) return;
            moved = true;
            ev.preventDefault();

            var pointerLocal = ev.clientX - tr.left;
            var velMag = Math.abs(vel);

            // Narrow when slow (< 0.15 px/ms), linearly wider as speed rises, capped at +58px
            var stretch = velMag < 0.15 ? 0 : Math.min((velMag - 0.15) * 42, 58);
            var stretchedW = baseW + stretch;

            // Trailing edge anchors, leading edge extends (comet tail)
            var newLeft;
            if (vel > 0.05) {
              newLeft = pointerLocal - baseW / 2;               // left anchors, right leads
            } else if (vel < -0.05) {
              newLeft = pointerLocal - stretchedW + baseW / 2;  // right anchors, left leads
            } else {
              newLeft = pointerLocal - stretchedW / 2;          // symmetric when still
            }

            newLeft = Math.max(3, Math.min(newLeft, tr.width - stretchedW - 3));
            stretchedW = Math.min(stretchedW, tr.width - newLeft - 3);

            pill.style.left = newLeft + 'px';
            pill.style.width = stretchedW + 'px';

            // Nearest tab by pill center
            var pillCenter = newLeft + stretchedW / 2;
            var nearestId = dragTabId, nearestDist = Infinity;
            NON_FAB.forEach(function (tid) {
              var b = getBounds(tid);
              if (!b) return;
              var d = Math.abs(pillCenter - (b.left + b.width / 2));
              if (d < nearestDist) { nearestDist = d; nearestId = tid; }
            });

            if (nearestId !== dragTabId) {
              dragTabId = nearestId;
              setPillAccent(nearestId);
              document.querySelectorAll('.tb-btn:not(.tb-add)').forEach(function (b2) {
                b2.classList.remove('active');
                var ic = b2.querySelector('.tb-icon'), lb = b2.querySelector('.tb-label');
                if (ic) ic.style.color = ''; if (lb) lb.style.color = '';
              });
              var nb = document.getElementById('tb-' + nearestId);
              if (nb && typeof TABS !== 'undefined' && TABS[nearestId]) {
                nb.classList.add('active');
                nb.querySelector('.tb-icon').style.color = TABS[nearestId].color;
                nb.querySelector('.tb-label').style.color = TABS[nearestId].color;
              }
              if (typeof haptic === 'function') haptic('light');
            }
          }

          function onUp() {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            if (moved) {
              _dragHandled = true;
              if (typeof switchTab === 'function') switchTab(dragTabId);
              else { pill.style.transition = SPRING; placePill(dragTabId); }
            }
          }

          document.addEventListener('pointermove', onMove, { passive: false });
          document.addEventListener('pointerup', onUp);
        });
      }

      window._lgPillPlace = placePill;
    })();

    init();
