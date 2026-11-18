// All formats are UTC.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function check(d: Date, who: string): void {
  if (!(d instanceof Date)) throw new TypeError(`${who}: expected a Date`);
  if (Number.isNaN(d.getTime())) throw new RangeError(`${who}: invalid Date`);
  const y = d.getUTCFullYear();
  if (y < 0 || y > 9999) throw new RangeError(`${who}: year ${y} is outside 0000-9999`);
}

const p2 = (n: number): string => String(n).padStart(2, '0');
const y4 = (d: Date): string => String(d.getUTCFullYear()).padStart(4, '0');

/** "Mon, 16 Nov 2026 19:05:07 +0000" (RFC 5322, UTC). */
export function formatRfc5322Date(d: Date): string {
  check(d, 'formatRfc5322Date');
  return `${DAYS[d.getUTCDay()]}, ${p2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${y4(d)} ` +
    `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} +0000`;
}

/** "2026/11/16 19:05" (yyyy/MM/dd HH:mm, UTC). */
export function formatB2fDate(d: Date): string {
  check(d, 'formatB2fDate');
  return `${y4(d)}/${p2(d.getUTCMonth() + 1)}/${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}

/** "20261116190507" (yyyyMMddHHmmss, UTC). */
export function formatCompactUtc(d: Date): string {
  check(d, 'formatCompactUtc');
  return `${y4(d)}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}` +
    `${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}`;
}
