    function getTagArr(t) { try { var a = JSON.parse(t.tag_ids || '[]'); return Array.isArray(a) ? a.map(function (item) { return typeof item === 'string' ? item : (item && item.name ? item.name : String(item)); }) : []; } catch (e) { return []; } }
    let localCustomTags = JSON.parse(localStorage.getItem('pwa_custom_tags') || '[]');
    function saveCustomTags() { localStorage.setItem('pwa_custom_tags', JSON.stringify(localCustomTags)); }
    function getAllTags() {
      var inferred = []; tasks.forEach(function (t) { try { var tgs = JSON.parse(t.tag_ids || '[]'); tgs.forEach(function (tg) { var n = typeof tg === 'string' ? tg : (tg && tg.name ? tg.name : null); if (!n) return; if (!PRESET_TAGS.find(function (pt) { return pt.name === n; }) && !localCustomTags.find(function (ct) { return ct.name === n; }) && !inferred.find(function (ct) { return ct.name === n; })) inferred.push({ name: n, color: (typeof tg === 'object' && tg.color) ? tg.color : 'var(--text2)' }); }); } catch (e) { } });
      return PRESET_TAGS.concat(localCustomTags).concat(inferred);
    }
    function getTagColor(name) { var tag = getAllTags().find(function (t) { return t.name === name; }); return tag ? tag.color : 'var(--text2)'; }
    function getProjectById(id) { return projects.find(function (p) { return p.id === id; }) || null; }
    function fmtRepeat(r) { return (!r || r === 'None') ? null : r; }
