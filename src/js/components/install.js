    var _installPrompt = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); _installPrompt = e;
      if (!localStorage.getItem('install-dismissed')) setTimeout(showInstallBanner, 4000);
    });
    function showInstallBanner() { var b = document.getElementById('install-banner'); if (b) b.classList.add('show'); }
    function hideInstallBanner(dismiss) { var b = document.getElementById('install-banner'); if (b) b.classList.remove('show'); if (dismiss) localStorage.setItem('install-dismissed', '1'); }
    function installApp() {
      if (!_installPrompt) return;
      _installPrompt.prompt();
      _installPrompt.userChoice.then(function (r) { if (r.outcome === 'accepted') { hideInstallBanner(true); haptic('success'); } else hideInstallBanner(false); _installPrompt = null; });
    }

    // â"€â"€â"€ Quick Capture Modal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    function showQCModal() { var m = document.getElementById('qc-modal'); if (m) m.classList.add('open'); }
    function closeQCModal() { var m = document.getElementById('qc-modal'); if (m) m.classList.remove('open'); }

    // â"€â"€â"€ Pull-to-Refresh â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    (function () {
      var area = document.getElementById('task-area'), ptr = document.getElementById('ptr');
      var startY = 0, pulling = false, THRESH = 72;
      area.addEventListener('touchstart', function (e) {
        startY = area.scrollTop === 0 ? e.touches[0].clientY : 0; pulling = false;
      }, { passive: true });
      area.addEventListener('touchmove', function (e) {
        if (!startY) return;
        var dy = e.touches[0].clientY - startY;
        if (dy <= 0) { pulling = false; ptr.style.opacity = 0; ptr.style.transform = ''; return; }
        pulling = true;
        var pct = Math.min(dy / THRESH, 1);
        ptr.style.opacity = pct;
        ptr.style.transform = 'rotate(' + (pct * 270) + 'deg)';
        if (dy >= THRESH && !ptr._fired) { ptr.classList.add('ready'); haptic('light'); ptr._fired = true; }
        if (dy < THRESH) { ptr.classList.remove('ready'); ptr._fired = false; }
      }, { passive: true });
      area.addEventListener('touchend', function () {
        if (!pulling) return;
        pulling = false;
        if (ptr.classList.contains('ready')) { haptic('medium'); syncTasks(); }
        ptr.style.opacity = 0; ptr.style.transform = ''; ptr.classList.remove('ready'); ptr._fired = false; startY = 0;
      });
    })();

