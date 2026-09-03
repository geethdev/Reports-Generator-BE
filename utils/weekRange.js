// Weeks run Monday -> Sunday. All computed in UTC to match how
// date-only strings (e.g. "2026-08-30") are parsed and stored.
function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

module.exports = { getStartOfWeek };
