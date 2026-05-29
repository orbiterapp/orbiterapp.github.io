    var _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    function getTagArr(t) { try { var a = JSON.parse(t.tag_ids || '[]'); return Array.isArray(a) ? a.map(function (item) { if (typeof item === 'string') { if (_UUID_RE.test(item)) { var _st = (typeof _supabaseTags !== 'undefined' && _supabaseTags[item]); return _st ? _st.name : null; } return item; } return (item && item.name ? item.name : null); }).filter(Boolean) : []; } catch (e) { return []; } }
    let localCustomTags = JSON.parse(localStorage.getItem('pwa_custom_tags') || '[]');
    function saveCustomTags() { localStorage.setItem('pwa_custom_tags', JSON.stringify(localCustomTags)); }
    function getAllTags() {
      var inferred = []; tasks.forEach(function (t) { try { var tgs = JSON.parse(t.tag_ids || '[]'); tgs.forEach(function (tg) { var n, color = 'var(--text2)'; if (typeof tg === 'string') { if (_UUID_RE.test(tg)) { var _st = (typeof _supabaseTags !== 'undefined' && _supabaseTags[tg]); if (!_st) return; n = _st.name; color = _st.color; } else { n = tg; } } else if (tg && tg.name) { n = tg.name; color = tg.color || color; } if (!n) return; if (!PRESET_TAGS.find(function (pt) { return pt.name === n; }) && !localCustomTags.find(function (ct) { return ct.name === n; }) && !inferred.find(function (ct) { return ct.name === n; })) inferred.push({ name: n, color: color }); }); } catch (e) { } });
      return PRESET_TAGS.concat(localCustomTags).concat(inferred);
    }
    function getTagColor(name) { var tag = getAllTags().find(function (t) { return t.name === name; }); return tag ? tag.color : 'var(--text2)'; }
    function getProjectById(id) { return projects.find(function (p) { return p.id === id; }) || null; }
    function fmtRepeat(r) { return (!r || r === 'None') ? null : r; }
