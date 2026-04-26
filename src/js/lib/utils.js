    function padLocalPart(n) { return String(n).padStart(2, '0'); }
    function toLocalDateValue(date) { return date.getFullYear() + '-' + padLocalPart(date.getMonth() + 1) + '-' + padLocalPart(date.getDate()); }
    function toLocalDateTimeValue(date) { return toLocalDateValue(date) + 'T' + padLocalPart(date.getHours()) + ':' + padLocalPart(date.getMinutes()); }
    function combineLocalDateTime(dateValue, timeValue) { return dateValue ? (dateValue + 'T' + (timeValue || '00:00')) : null; }

    // â”€â”€â”€ NLP Parser (web quick-add) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function _nlpParseTime(s) { var l = s.toLowerCase(), pm = l.endsWith('pm'), am = l.endsWith('am'), st = (pm || am) ? l.slice(0, -2) : l; if (!st) return null; var p = st.split(':'); var h = parseInt(p[0]); if (isNaN(h)) return null; var m = p.length > 1 ? parseInt(p[1]) || 0 : 0; if (pm && h < 12) h += 12; if (am && h === 12) h = 0; return (h >= 0 && h <= 23 && m >= 0 && m <= 59) ? [h, m] : null; }
    function _nlpNamedDay(w) { var d = { today: 0, tomorrow: 1 }; if (w in d) return d[w]; var m = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }; if (w in m) { var c = new Date().getDay(), df = (m[w] - c + 7) % 7; return df === 0 ? 7 : df; } return null; }
    function _nlpMonthNum(s) { var m = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }; return m[s.toLowerCase().substring(0, 3)] || null; }

    // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function uuid() { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }
    function pClass(p) { return { High: 'p-high', Medium: 'p-medium', Low: 'p-low' }[p] || ''; }
    function fmtDue(ds) { if (!ds) return null; const d = new Date(ds), t = new Date(); t.setHours(0, 0, 0, 0); var hasTime = ds.includes('T') && !ds.endsWith('T00:00:00.000Z') && !ds.includes('T00:00:00'); var timeSuffix = hasTime ? ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''; if (d < t) return { text: 'Overdue', cls: 'chip-overdue' }; if (d < new Date(t.getTime() + 864e5)) return { text: 'Today' + timeSuffix, cls: 'chip-today' }; if (d < new Date(t.getTime() + 1728e5)) return { text: 'Tomorrow' + timeSuffix, cls: 'chip-due' }; return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + timeSuffix, cls: 'chip-due' }; }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
