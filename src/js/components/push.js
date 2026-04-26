    function haptic(type) {
      if (!navigator.vibrate) return;
      ({ light: function () { navigator.vibrate(10); }, medium: function () { navigator.vibrate(25); }, heavy: function () { navigator.vibrate(50); }, success: function () { navigator.vibrate([12, 40, 18]); } }[type] || function () { })();
    }

    // â”€â”€â”€ App Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function updateAppBadge() {
      if (!('setAppBadge' in navigator)) return;
      var t = new Date(); t.setHours(0, 0, 0, 0);
      var n = tasks.filter(function (x) { if (x.is_completed) return false; if (x.is_today_task) return true; if (!x.due_date) return false; var d = new Date(x.due_date); return d >= t && d < new Date(t.getTime() + 864e5); }).length;
      n > 0 ? navigator.setAppBadge(n).catch(function () { }) : navigator.clearAppBadge().catch(function () { });
    }

    // â”€â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function requestNotifPermission() {
      if (!('Notification' in window)) { toast('Notifications not supported on this device'); return; }
      if (Notification.permission === 'granted') { toast('Notifications already enabled âœ“'); subscribeToPush(); return; }
      Notification.requestPermission().then(function (p) {
        if (p === 'granted') { toast('Notifications enabled!'); haptic('success'); subscribeToPush(); }
        else toast('Notifications blocked â€” check browser settings');
      });
    }

    // â”€â”€â”€ Quiet Hours â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var _qh = (function() { try { return JSON.parse(localStorage.getItem('orbiter_quiet_hours') || '{}'); } catch { return {}; } })();
    function _syncQuietHoursToSW() {
      var enabled = !!_qh.enabled, start = _qh.start || '22:00', end = _qh.end || '07:00';
      navigator.serviceWorker?.ready.then(function(reg) { reg.active?.postMessage({ type: 'SET_QUIET_HOURS', enabled, start, end }); });
    }
    function initQuietHoursUI() {
      var tog = document.getElementById('tog-quiet-hours'), s = document.getElementById('qh-start'), e = document.getElementById('qh-end');
      if (tog) tog.classList.toggle('on', !!_qh.enabled);
      if (s && _qh.start) s.value = _qh.start;
      if (e && _qh.end) e.value = _qh.end;
    }
    function toggleQuietHours(ev) { ev.stopPropagation(); _qh.enabled = !_qh.enabled; document.getElementById('tog-quiet-hours').classList.toggle('on', _qh.enabled); saveQuietHours(); }
    function saveQuietHours() {
      _qh.start = document.getElementById('qh-start')?.value || '22:00';
      _qh.end = document.getElementById('qh-end')?.value || '07:00';
      try { localStorage.setItem('orbiter_quiet_hours', JSON.stringify(_qh)); } catch { }
      _syncQuietHoursToSW();
    }

    // ORB-117: Subscribe to web push notifications
    async function subscribeToPush() {
      if (!VAPID_PUBLIC_KEY) return; // not configured yet
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: VAPID_PUBLIC_KEY
          });
        }
        await api('push_subscriptions', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ user_id: session.user.id, subscription: JSON.stringify(sub) })
        });
      } catch (e) { /* push subscription failed silently */ }
    }

    // Listen for messages from sw notificationclick
    navigator.serviceWorker?.addEventListener('message', function (e) {
      if (e.data?.type === 'COMPLETE_TASK') {
        var t = tasks.find(function (x) { return x.id === e.data.taskId; });
        if (t) completeTask(t);
      } else if (e.data?.type === 'SNOOZE_TASK') {
        var tk = tasks.find(function (x) { return x.id === e.data.taskId; });
        if (tk) {
          var base = tk.due_date ? new Date(tk.due_date) : new Date();
          base.setHours(base.getHours() + 1);
          var newDue = toLocalDateTimeValue(base);
          tk.due_date = newDue;
          tk.notified_at = null;
          patch(tk.id, { due_date: newDue, notified_at: null });
          render();
          toast('Snoozed 1 hour');
        }
      }
    });

    // â”€â”€â”€ PWA Install Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
