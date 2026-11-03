/* Fabrique un fichier calendrier (.ics) avec une alerte, lu par l'app Calendrier de l'iPhone. */
self.vracICS = function (title, due, hasTime, id) {
  const p = n => String(n).padStart(2, '0');
  const utc = d => d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  const day = d => d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const start = new Date(+due);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vrac//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:' + (id || Date.now()) + '@vrac', 'DTSTAMP:' + utc(new Date())];
  if (hasTime) lines.push('DTSTART:' + utc(start), 'DTEND:' + utc(new Date(+due + 15 * 60000)));
  else { const next = new Date(start); next.setDate(next.getDate() + 1); lines.push('DTSTART;VALUE=DATE:' + day(start), 'DTEND;VALUE=DATE:' + day(next)); }
  lines.push('SUMMARY:' + esc(title), 'DESCRIPTION:' + esc('Rappel ajouté depuis Vrac'),
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'TRIGGER:' + (hasTime ? '-PT0M' : 'PT9H'), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
};
