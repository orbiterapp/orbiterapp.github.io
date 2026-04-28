    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    // ORB-84: Toast with working Undo button.
    // undoFn must be a real Function (not a string) so closure variables are captured.
    var _toastQueue = [];
    var _toastBusy = false;
    function toast(msg, ms, undoFn) {
      _toastQueue.push({ msg: msg, ms: ms || 2200, undoFn: undoFn });
      if (!_toastBusy) _nextToast();
    }
    function _nextToast() {
      if (!_toastQueue.length) { _toastBusy = false; return; }
      _toastBusy = true;
      var item = _toastQueue.shift();
      var el = document.getElementById('toast-msg');
      el.innerHTML = item.msg + (item.undoFn ? '<button class="toast-undo" id="toast-undo-btn">Undo</button>' : '');
      el.classList.add('show');
      clearTimeout(window._toastTimer);
      if (item.undoFn) {
        window._toastUndoFn = typeof item.undoFn === 'function' ? item.undoFn : null;
        var undoBtn = document.getElementById('toast-undo-btn');
        if (undoBtn) {
          undoBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            clearTimeout(window._toastTimer);
            el.classList.remove('show');
            if (window._toastUndoFn) { window._toastUndoFn(); window._toastUndoFn = null; }
            setTimeout(_nextToast, 150);
          });
        }
      }
      window._toastTimer = setTimeout(function () {
        el.classList.remove('show');
        window._toastUndoFn = null;
        setTimeout(_nextToast, 150);
      }, item.ms);
    }
