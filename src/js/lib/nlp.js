    function parseNLPWeb(input) {
      var words = input.split(/\s+/).filter(Boolean), pri = 'None', flag = false, energy = 'None', estMin = null, rm = new Set();
      var projectMatch = null, tagMatches = [];
      words.forEach(function (w, i) {
        switch (w.toLowerCase()) {
          case '!high': pri = 'High'; rm.add(i); break; case '!medium': pri = 'Medium'; rm.add(i); break; case '!low': pri = 'Low'; rm.add(i); break;
          case '!flag': case '!flagged': flag = true; rm.add(i); break;
          case '~high': energy = 'High'; rm.add(i); break; case '~medium': energy = 'Medium'; rm.add(i); break; case '~low': energy = 'Low'; rm.add(i); break;
          default:
            if (w.startsWith('~') && (w.endsWith('m') || w.endsWith('h'))) { var n = parseInt(w.slice(1, -1)); if (!isNaN(n) && n > 0) { estMin = w.endsWith('h') ? n * 60 : n; rm.add(i); } }
            if (w.startsWith('#') && w.length > 1) { var pq = w.slice(1).toLowerCase(); var pm2 = projects.find(function (p) { return p.name.toLowerCase().startsWith(pq); }); if (pm2) { projectMatch = pm2; rm.add(i); } }
            if (w.startsWith('@') && w.length > 1) { var tq = w.slice(1).toLowerCase(); var allT = getAllTags(); var tm = allT.find(function (t) { return t.name.toLowerCase().startsWith(tq); }); if (tm && !tagMatches.find(function (x) { return x.name === tm.name; })) { tagMatches.push(tm); rm.add(i); } }
        }
      });
      words = words.filter(function (_, i) { return !rm.has(i); }); rm = new Set();
      var due = null, defer = null, timeH = null, timeM = 0;
      var today = new Date(); today.setHours(0, 0, 0, 0);
      for (var i = 0; i < words.length; i++) {
        var w = words[i].toLowerCase();
        if ((w === 'defer' || w === 'start') && i + 1 < words.length) { var doff = _nlpNamedDay(words[i + 1].toLowerCase()); if (doff !== null) { defer = new Date(today); defer.setDate(defer.getDate() + doff); rm.add(i); rm.add(i + 1); i++; continue; } }
        if (w === 'at' && i + 1 < words.length) { var t = _nlpParseTime(words[i + 1]); if (t) { timeH = t[0]; timeM = t[1]; rm.add(i); rm.add(i + 1); i++; continue; } }
        var t2 = _nlpParseTime(w); if (t2) { timeH = t2[0]; timeM = t2[1]; rm.add(i); continue; }
        var off = _nlpNamedDay(w); if (off !== null) { if (!due) { due = new Date(today); due.setDate(due.getDate() + off); } rm.add(i); continue; }
        if (w === 'next' && i + 1 < words.length && words[i + 1].toLowerCase() === 'week') { due = new Date(today); due.setDate(due.getDate() + 7); rm.add(i); rm.add(i + 1); i++; continue; }
        var mon = _nlpMonthNum(w); if (mon !== null && i + 1 < words.length) { var day = parseInt(words[i + 1]); if (day) { due = new Date(today.getFullYear(), mon - 1, day); if (due < today) due.setFullYear(due.getFullYear() + 1); rm.add(i); rm.add(i + 1); i++; continue; } }
        var mdm = w.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/); if (mdm) { var mm = parseInt(mdm[1]), dd = parseInt(mdm[2]), yy = mdm[3] ? (mdm[3].length === 2 ? 2000 + parseInt(mdm[3]) : parseInt(mdm[3])) : today.getFullYear(); if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) { due = new Date(yy, mm - 1, dd); if (due < today && !mdm[3]) due.setFullYear(due.getFullYear() + 1); rm.add(i); continue; } }
      }
      if (timeH !== null) { if (!due) due = new Date(today); due.setHours(timeH, timeM, 0, 0); }
      var remaining = words.filter(function (_, i) { return !rm.has(i); }).join(' ').trim();
      var dueISO = due ? toLocalDateTimeValue(due) : null;
      var deferISO = defer ? toLocalDateValue(defer) : null;
      var hasMatch = dueISO || pri !== 'None' || flag || estMin !== null || energy !== 'None' || deferISO || projectMatch || tagMatches.length;
      if (!hasMatch) return null;
      return { title: remaining || input, dueDate: dueISO, deferDate: deferISO, priority: pri, isFlagged: flag, estimatedMinutes: estMin, energy: energy, projectId: projectMatch ? projectMatch.id : null, projectName: projectMatch ? projectMatch.name : null, projectColor: projectMatch ? projectMatch.color : null, tagNames: tagMatches.map(function (t) { return t.name; }), tagColors: tagMatches.map(function (t) { return t.color; }) };
    }
    var _nlpTimer = null;
    function _bindNLPInput() {
      var inp = document.getElementById('i-title');
      if (!inp || inp._nlpBound) return;
      inp._nlpBound = true;
      inp.addEventListener('input', function () {
        clearTimeout(_nlpTimer);
        _nlpTimer = setTimeout(function () {
          var strip = document.getElementById('i-nlp-strip');
          if (!strip) return;
          var parsed = parseNLPWeb(inp.value);
          if (!parsed) { strip.style.display = 'none'; strip.innerHTML = ''; return; }
          var chip = function (label, bg, fg) { return '<span style="background:' + bg + ';color:' + fg + ';padding:2px 7px;border-radius:12px;font-size:11px;font-weight:600">' + label + '</span>'; };
          var h = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="flex-shrink:0;margin-right:2px"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/></svg>';
          if (parsed.dueDate) { var dd = new Date(parsed.dueDate); h += chip((dd.getHours() ? dd.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' ' + dd.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : dd.toLocaleDateString('en-US',{month:'short',day:'numeric'})), 'var(--blue-dim)', 'var(--blue)'); }
          if (parsed.deferDate) { var df = new Date(parsed.deferDate + 'T00:00:00'); h += chip('Defer: ' + df.toLocaleDateString('en-US',{month:'short',day:'numeric'}), 'var(--accent-dim)', 'var(--accent)'); }
          if (parsed.priority !== 'None') { var pc = {High:'var(--red)',Medium:'var(--amber)',Low:'var(--cyan)'}[parsed.priority]; h += chip('!' + parsed.priority, pc + '22', pc); }
          if (parsed.isFlagged) h += chip('Flagged', 'var(--pink-dim)', 'var(--pink)');
          if (parsed.energy !== 'None') { var ec = {High:'var(--red)',Medium:'var(--amber)',Low:'var(--green)'}[parsed.energy]; h += chip('~' + parsed.energy, ec + '22', ec); }
          if (parsed.estimatedMinutes) { var em = parsed.estimatedMinutes; h += chip((em >= 60 ? Math.round(em/60) + 'h' : em + 'm'), 'var(--green-dim)', 'var(--green)'); }
          if (parsed.projectName) h += chip('â†— ' + parsed.projectName, (parsed.projectColor || '#8C59F2') + '22', parsed.projectColor || '#8C59F2');
          if (parsed.tagNames && parsed.tagNames.length) { parsed.tagNames.forEach(function (tn, ti) { var tc2 = parsed.tagColors[ti] || 'var(--text2)'; h += chip('#' + tn, tc2 + '22', tc2); }); }
          h += '<button onclick="applyNLPWeb()" style="margin-left:auto;background:var(--accent);color:#fff;border:none;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer">Apply</button>';
          strip.innerHTML = h; strip.style.display = 'flex';
        }, 150);
      });
    }
    function applyNLPWeb() {
      var inp = document.getElementById('i-title');
      var strip = document.getElementById('i-nlp-strip');
      if (!inp) return;
      var parsed = parseNLPWeb(inp.value);
      if (!parsed) return;
      inp.value = parsed.title;
      if (parsed.dueDate) {
        var d = new Date(parsed.dueDate);
        document.getElementById('i-due').value = toLocalDateValue(d);
        if (d.getHours() || d.getMinutes()) document.getElementById('i-due-time').value = padLocalPart(d.getHours()) + ':' + padLocalPart(d.getMinutes());
      }
      if (parsed.priority !== 'None') document.getElementById('i-priority').value = parsed.priority;
      if (parsed.isFlagged) { var tog = document.getElementById('tog-flag'); if (tog && !tog.classList.contains('on')) tog.click(); }
      if (parsed.projectId) { var ps = document.getElementById('i-project'); if (ps) ps.value = parsed.projectId; }
      if (parsed.tagNames && parsed.tagNames.length) { parsed.tagNames.forEach(function (tn) { if (!addModalTags.includes(tn)) addModalTags.push(tn); }); buildTagsPicker('i-tags-picker', addModalTags); }
      if (strip) { strip.style.display = 'none'; strip.innerHTML = ''; }
    }

