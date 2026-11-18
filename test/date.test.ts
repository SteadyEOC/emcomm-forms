import { describe, expect, it } from 'vitest';
import { formatB2fDate, formatCompactUtc, formatRfc5322Date } from '../src/index.js';

// 2026-11-16 is a Monday (checked: 2026-01-01 is a Thursday; day 320 of the year; (3 + 319) mod 7 = 0 -> Mon).
const d = new Date(Date.UTC(2026, 10, 16, 19, 5, 7));

describe('date formats (UTC)', () => {
  it('RFC 5322', () => {
    expect(formatRfc5322Date(d)).toBe('Mon, 16 Nov 2026 19:05:07 +0000');
  });
  it('B2F', () => {
    expect(formatB2fDate(d)).toBe('2026/11/16 19:05');
  });
  it('compact', () => {
    expect(formatCompactUtc(d)).toBe('20261116190507');
  });
  it('pads single digits and uses the right day names', () => {
    const e = new Date(Date.UTC(2027, 0, 3, 4, 5, 6)); // Sunday
    expect(formatRfc5322Date(e)).toBe('Sun, 03 Jan 2027 04:05:06 +0000');
    expect(formatB2fDate(e)).toBe('2027/01/03 04:05');
    expect(formatCompactUtc(e)).toBe('20270103040506');
  });
  it('ignores the local time zone and the milliseconds', () => {
    expect(formatCompactUtc(new Date('2026-12-31T23:59:59.999Z'))).toBe('20261231235959');
    expect(formatRfc5322Date(new Date('2026-12-31T23:59:59.999Z'))).toBe('Thu, 31 Dec 2026 23:59:59 +0000');
  });
  it('throws on an invalid Date', () => {
    for (const f of [formatRfc5322Date, formatB2fDate, formatCompactUtc]) {
      expect(() => f(new Date('nope'))).toThrow(RangeError);
    }
  });
  it('throws on a non-Date and on years outside 0000-9999', () => {
    expect(() => formatB2fDate('2026-11-16' as unknown as Date)).toThrow(TypeError);
    expect(() => formatCompactUtc(new Date(Date.UTC(10000, 0, 1)))).toThrow(RangeError);
  });
});
