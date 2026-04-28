    // â”€â”€â”€ Swipe Gestures (right = complete, left = delete) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    (function () {
      var area = document.getElementById('task-area');
      var sX = 0, sY = 0, aRow = null, aId = null, sw = false, THRESH = 55, MAX = 130;
      var leftAction = null, rightAction = null;

      function ensureActions(row) {
        if (!row.querySelector('.swipe-action.left')) {
          var left = document.createElement('div');
          left.className = 'swipe-action left';
          left.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span style="font-size:12px;font-weight:700;color:#34d399;margin-left:8px">Done</span>';
          row.insertBefore(left, row.firstChild);
        }
        if (!row.querySelector('.swipe-action.right')) {
          var right = document.createElement('div');
          right.className = 'swipe-action right';
          right.innerHTML = '<span style="font-size:12px;font-weight:700;color:#ef4444;margin-right:8px">Delete</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
          row.appendChild(right);
        }
        leftAction = row.querySelector('.swipe-action.left');
        rightAction = row.querySelector('.swipe-action.right');
      }

      function cleanActions(row) {
        if (!row) return;
        var acts = row.querySelectorAll('.swipe-action');
        acts.forEach(function (a) { a.remove(); });
        leftAction = null; rightAction = null;
      }

      // Rubber-band easing — moves freely up to threshold, then dampens
      function rubberBand(x, max) {
        var abs = Math.abs(x), sign = x < 0 ? -1 : 1;
        if (abs <= THRESH) return x;
        var over = abs - THRESH;
        var damped = THRESH + over * 0.35;
        return sign * Math.min(damped, max);
      }

      area.addEventListener('touchstart', function (e) {
        var r = e.target.closest('.task-row');
        if (!r || e.target.closest('.chk') || e.target.closest('.drag-handle') || e.target.closest('.row-del-btn') || showArchived) return;
        aRow = r; aId = r.id.replace('task-', ''); sX = e.touches[0].clientX; sY = e.touches[0].clientY; sw = false;
        r.style.transition = 'none';
        r._hf = false;
        ensureActions(r);
      }, { passive: true });

      area.addEventListener('touchmove', function (e) {
        if (!aRow) return;
        var dx = e.touches[0].clientX - sX, dy = e.touches[0].clientY - sY;
        if (!sw && Math.abs(dy) > Math.abs(dx) + 5) { aRow.style.transition = ''; cleanActions(aRow); aRow = null; return; }
        sw = true;
        var c = rubberBand(dx, MAX);
        aRow.style.transform = 'translateX(' + c + 'px)';
        // Show/animate action indicators with smooth opacity
        var absDx = Math.abs(dx);
        if (leftAction) {
          var lOpacity = dx > 10 ? Math.min(dx / THRESH, 1) : 0;
          leftAction.style.opacity = lOpacity;
          leftAction.classList.toggle('active', dx > 10);
          leftAction.classList.toggle('triggered', dx >= THRESH);
        }
        if (rightAction) {
          var rOpacity = dx < -10 ? Math.min(Math.abs(dx) / THRESH, 1) : 0;
          rightAction.style.opacity = rOpacity;
          rightAction.classList.toggle('active', dx < -10);
          rightAction.classList.toggle('triggered', dx <= -THRESH);
        }
        if (!aRow._hf && (dx >= THRESH || dx <= -THRESH)) { haptic('medium'); aRow._hf = true; }
        if (aRow._hf && dx < THRESH && dx > -THRESH) aRow._hf = false;
      }, { passive: true });

      area.addEventListener('touchend', function (e) {
        if (!aRow || !sw) { if (aRow) cleanActions(aRow); aRow = null; sw = false; return; }
        var dx = e.changedTouches[0].clientX - sX, row = aRow, id = aId;
        if (dx > THRESH) {
          // Swipe right â†’ complete
          haptic('success');
          row.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1), opacity .28s ease';
          row.style.transform = 'translateX(110vw)'; row.style.opacity = '0';
          setTimeout(function () { cleanActions(row); completeTask(id); }, 280);
        } else if (dx < -THRESH) {
          // Swipe left â†’ delete
          haptic('heavy');
          row.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1), opacity .28s ease';
          row.style.transform = 'translateX(-110vw)'; row.style.opacity = '0';
          setTimeout(function () { cleanActions(row); quickDeleteTask(id); }, 280);
        } else {
          // Bounce back with spring
          row.style.transition = 'transform .35s cubic-bezier(.175,.885,.32,1.275)';
          row.style.transform = '';
          setTimeout(function () { cleanActions(row); row.style.transition = ''; }, 350);
        }
        aRow = null; sw = false;
      });
    })();
