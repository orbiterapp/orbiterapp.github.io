
    // â"€â"€â"€ Settings Screen â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    function openSettings() {
      // Sync dynamic state
      var al = document.getElementById('archive-label'), sal = document.getElementById('settings-archive-label');
      if (al && sal) sal.textContent = al.textContent;
      renderThemePicker();
      renderSettingsAccentPicker();
      loadSettingsConfirmDelete();
      initQuietHoursUI();
      updateAvatar();
      toggleMenu(false);
      show('screen-settings');
    }
    function closeSettings() { show('screen-app'); }
    function renderSettingsAccentPicker() {
      var c = document.getElementById('settings-accent-picker');
      if (!c) return;
      var cur = localStorage.getItem('accent_color') || ACCENT_COLORS[0].value;
      c.innerHTML = ACCENT_COLORS.map(function(a) {
        return '<div class="color-swatch' + (a.value === cur ? ' selected' : '') + '" style="background:' + a.value + '" title="' + a.name + '" onclick="setAccentColor(\'' + a.value + '\')"></div>';
      }).join('');
    }
    function loadSettingsConfirmDelete() {
      var enabled = localStorage.getItem('confirm_before_delete') === 'true';
      var t = document.getElementById('settings-confirm-delete');
      if (t) t.classList.toggle('on', enabled);
    }
    function toggleSettingsConfirmDelete(e) {
      if (e) e.stopPropagation();
      var st = document.getElementById('settings-confirm-delete');
      var mt = document.getElementById('confirm-delete-toggle');
      var enabled = st ? !st.classList.contains('on') : false;
      if (st) st.classList.toggle('on', enabled);
      if (mt) mt.classList.toggle('on', enabled);
      localStorage.setItem('confirm_before_delete', enabled ? 'true' : 'false');
    }

    // â"€â"€â"€ Avatar / Menu â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

    function saveUserPreferences() {
      if (!session) return;
      var prefs = {
        theme: localStorage.getItem('theme') || 'system',
        accent_color: localStorage.getItem('accent_color') || '',
        confirm_before_delete: localStorage.getItem('confirm_before_delete') || 'false',
        inbox_sort: localStorage.getItem('inbox_sort') || 'created',
        quiet_hours: (function() { try { return JSON.parse(localStorage.getItem('orbiter_quiet_hours') || '{}'); } catch(e) { return {}; } })()
      };
      api('user_preferences', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: session.user.id, preferences: prefs, updated_at: new Date().toISOString() })
      }).catch(function () {});
    }

    var _themeMedia = window.matchMedia('(prefers-color-scheme: light)');

    function getThemePreference() {
      return localStorage.getItem('theme') || 'system';
    }

    function getResolvedTheme(pref) {
      if (pref === 'light') return 'light';
      if (pref === 'dark') return 'dark';
      return _themeMedia.matches ? 'light' : 'dark';
    }

    function renderThemePicker() {
      var picker = document.getElementById('settings-theme-picker');
      if (!picker) return;
      var pref = getThemePreference();
      Array.prototype.forEach.call(picker.querySelectorAll('.st-theme-opt'), function (btn) {
        var isActive = btn.dataset.theme === pref;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function updateThemeMeta(isLight) {
      var mc = document.querySelector('meta[name="theme-color"]');
      if (!mc) { mc = document.createElement('meta'); mc.name = 'theme-color'; document.head.appendChild(mc); }
      mc.content = isLight ? '#f5f5f7' : '#0c0c0e';
    }

    function updateThemeLabels() {
      var pref = getThemePreference();
      var resolved = getResolvedTheme(pref);
      var isLight = resolved === 'light';
      var tl = document.getElementById('theme-label');
      if (tl) tl.textContent = isLight ? 'Dark Mode' : 'Light Mode';
      var dl = document.getElementById('ds-theme-label');
      if (dl) dl.textContent = isLight ? 'Dark Mode' : 'Light Mode';
      renderThemePicker();
      updateThemeMeta(isLight);
    }

    function applyTheme(pref) {
      var resolved = getResolvedTheme(pref);
      document.body.classList.toggle('light', resolved === 'light');
      updateThemeLabels();
    }

    function setTheme(theme) {
      localStorage.setItem('theme', theme);
      applyTheme(theme);
      saveUserPreferences();
    }

    function toggleTheme() {
      var next = getResolvedTheme(getThemePreference()) === 'light' ? 'dark' : 'light';
      setTheme(next);
    }

    function loadTheme() {
      applyTheme(getThemePreference());
    }

    _themeMedia.addEventListener('change', function () {
      if (getThemePreference() === 'system') applyTheme('system');
    });

    // â"€â"€â"€ ORB-88: Accent Color Picker â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    var ACCENT_COLORS = [
      { name: 'Lilac', value: '#B49BFF' },
      { name: 'Electric', value: '#7C7CFF' },
      { name: 'Sky', value: '#7DB7FF' },
      { name: 'Mint', value: '#6EE7C7' },
      { name: 'Coral', value: '#FF8A65' },
      { name: 'Sunset', value: '#FFB068' },
      { name: 'Rose', value: '#FF8AC9' },
      { name: 'Gold', value: '#FFC857' },
    ];
    function loadAccentColor() {
      var saved = localStorage.getItem('accent_color');
      var accent = saved || ACCENT_COLORS[0].value;
      document.documentElement.style.setProperty('--accent', accent);
      renderAccentPicker();
    }
    function setAccentColor(value) {
      localStorage.setItem('accent_color', value);
      document.documentElement.style.setProperty('--accent', value);
      renderAccentPicker();
      renderSettingsAccentPicker();
      saveUserPreferences();
    }
    function renderAccentPicker() {
      var container = document.getElementById('accent-picker');
      if (!container) return;
      var current = localStorage.getItem('accent_color') || ACCENT_COLORS[0].value;
      container.innerHTML = ACCENT_COLORS.map(function(c) {
        return '<div class="color-swatch' + (c.value === current ? ' selected' : '') + '" style="background:' + c.value + '" title="' + c.name + '" onclick="setAccentColor(\'' + c.value + '\')"></div>';
      }).join('');
    }

    // â"€â"€â"€ ORB-87: Confirm Before Delete â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    function loadConfirmDeleteSetting() {
      var val = localStorage.getItem('confirm_before_delete');
      var enabled = (val === 'true');
      var toggle = document.getElementById('confirm-delete-toggle');
      if (toggle) {
        toggle.classList.toggle('on', enabled);
      }
      return enabled;
    }
    function toggleConfirmDelete(e) {
      if (e) e.stopPropagation();
      var toggle = document.getElementById('confirm-delete-toggle');
      var enabled = !toggle.classList.contains('on');
      toggle.classList.toggle('on', enabled);
      localStorage.setItem('confirm_before_delete', enabled ? 'true' : 'false');
    }
    function shouldConfirmDelete() {
      return localStorage.getItem('confirm_before_delete') === 'true';
    }

    // â"€â"€â"€ Smart Filters â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
