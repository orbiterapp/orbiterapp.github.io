    function openTagManager() {
      document.getElementById('tag-manager-bg').style.display = 'flex';
      renderTagManagerList();
    }
    function closeTagManager() {
      document.getElementById('tag-manager-bg').style.display = 'none';
    }
    function renderTagManagerList() {
      var list = document.getElementById('tag-manager-list');
      var allTags = getAllTags();
      if (!allTags.length) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">No tags yet</div>'; return; }
      list.innerHTML = allTags.map(function (tag, i) {
        var count = tasks.filter(function (t) { try { return (JSON.parse(t.tag_ids || '[]')).includes(tag.name); } catch { return false; } }).length;
        var isPreset = PRESET_TAGS.some(function (p) { return p.name === tag.name; });
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">'
          + '<span style="width:10px;height:10px;border-radius:50%;background:' + tag.color + ';flex-shrink:0"></span>'
          + '<span style="flex:1;font-size:14px;font-weight:500">' + esc(tag.name) + '</span>'
          + '<span style="font-size:12px;color:var(--text3)">' + count + ' task' + (count !== 1 ? 's' : '') + '</span>'
          + (!isPreset ? '<button onclick="deleteCustomTag(\'' + esc(tag.name) + '\')" style="background:none;border:none;color:var(--text3);cursor:pointer;padding:4px;border-radius:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' : '')
          + '</div>';
      }).join('');
    }
    function createCustomTag() {
      var name = document.getElementById('new-tag-name').value.trim();
      var color = document.getElementById('new-tag-color').value;
      if (!name) { document.getElementById('new-tag-name').focus(); return; }
      if (getAllTags().some(function (t) { return t.name.toLowerCase() === name.toLowerCase(); })) { toast('Tag already exists'); return; }
      localCustomTags.push({ name: name, color: color });
      saveCustomTags();
      document.getElementById('new-tag-name').value = '';
      renderTagManagerList();
      toast('Tag created');
    }
    function deleteCustomTag(name) {
      var backup = localCustomTags.find(function (t) { return t.name === name; });
      localCustomTags = localCustomTags.filter(function (t) { return t.name !== name; });
      saveCustomTags();
      renderTagManagerList();
      render();
      var count = tasks.filter(function (t) { try { return (JSON.parse(t.tag_ids || '[]')).some(function(x){ return (x.name||x) === name; }); } catch { return false; } }).length;
      var msg = count > 0 ? 'Tag deleted (' + count + ' task' + (count !== 1 ? 's' : '') + ' affected)' : 'Tag deleted';
      toast(msg, 3500, function () {
        if (backup) { localCustomTags.push(backup); saveCustomTags(); renderTagManagerList(); render(); toast('Restored'); }
      });
    }

    // â”€â”€â”€ Misc event handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

