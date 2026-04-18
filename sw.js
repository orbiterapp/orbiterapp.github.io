// ORB-116: bump CACHE_VERSION on each release to invalidate old caches
const CACHE_VERSION = 'v11';
// Quiet hours state — updated via message from client page
let _qhEnabled = false, _qhStart = '22:00', _qhEnd = '07:00';
function _isQuietHours() {
  if (!_qhEnabled) return false;
  const now = new Date(), hm = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = _qhStart.split(':').map(Number), [eh, em] = _qhEnd.split(':').map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s <= e ? (hm >= s && hm < e) : (hm >= s || hm < e);
}
const CACHE = `orbiter-${CACHE_VERSION}`;
const SHELL  = ['./index.html', './quick.html', './manifest.json', './iconbg.png', './auth.js', './shader-background.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

// ORB-116: allow clients to trigger immediate activation on update
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'SET_QUIET_HOURS') { _qhEnabled = !!e.data.enabled; _qhStart = e.data.start || '22:00'; _qhEnd = e.data.end || '07:00'; }
});

self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
);

// ORB-117: Push notification handler for due-date reminders
function formatPushTitle(taskTitle, dueDate) {
  const due = new Date(dueDate);
  const now = new Date();
  const min = Math.round((due - now) / 60000);
  const timeStr = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (min <= 0) return `${taskTitle} is due now`;
  if (min < 60) return `${taskTitle} due in ${min} minute${min !== 1 ? 's' : ''}`;
  if (min < 24 * 60) {
    const h = Math.round(min / 60);
    return `${taskTitle} due in ${h} hour${h !== 1 ? 's' : ''}`;
  }
  const d = Math.round(min / (24 * 60));
  return `${taskTitle} due in ${d} day${d !== 1 ? 's' : ''}`;
}

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title = data.taskTitle && data.dueDate
    ? formatPushTitle(data.taskTitle, data.dueDate)
    : (data.title || 'Task Due');
  let body = data.body || '';
  if (data.count <= 1 && data.dueDate) {
    const due = new Date(data.dueDate);
    const t = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const d = `${due.getMonth() + 1}/${due.getDate()}`;
    body = `Due at ${t} ${d}`;
  }
  event.waitUntil(
    _isQuietHours()
      ? self.registration.showNotification(title, { silent: true, badge: '/iconbg.png', data: { taskId: data.taskId } })
      : self.registration.showNotification(title, {
          body, icon: '/iconbg.png', badge: '/iconbg.png',
          data: { taskId: data.taskId },
          actions: [{ action: 'complete', title: 'Mark Complete' }, { action: 'snooze', title: 'Snooze 1 hr' }]
        })
  );
});

self.addEventListener('notificationclick', event => {
  const taskId = event.notification.data?.taskId;
  event.notification.close();
  if (event.action === 'complete' && taskId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length) {
          clients[0].postMessage({ type: 'COMPLETE_TASK', taskId });
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  } else if (event.action === 'snooze' && taskId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length) {
          clients[0].postMessage({ type: 'SNOOZE_TASK', taskId });
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length) return clients[0].focus();
        return self.clients.openWindow('/');
      })
    );
  }
});

// Network first, fall back to cache (so tasks are always fresh when online)
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.mode === 'navigate') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
