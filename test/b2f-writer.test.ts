// writeB2f is golden-tested byte for byte against real Pat 1.0.1 outbox files.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { check, formatIssue, writeB2f } from '../src/index.js';
import type { B2fMessage } from '../src/index.js';

const sample = (n: string): Uint8Array =>
  new Uint8Array(readFileSync(fileURLToPath(new URL(`./samples/pat/pat-1.0.1-${n}.b2f`, import.meta.url))));
const when = new Date(Date.UTC(2026, 10, 17, 6, 6, 30));
const ascii = (s: string): Uint8Array => Uint8Array.from(s, (c) => c.charCodeAt(0));
const text = (b: Uint8Array): string => Buffer.from(b).toString('latin1');

// The CSV is typed here; the JPEG bytes (not text) are cut out of the sample by the sizes in its headers.
const csv = ascii('Name,Status\nTeam A,deployed\n');
function jpg(): Uint8Array {
  const s = sample('attachments-csv-png');
  const at = text(s).indexOf('\r\n\r\n') + 4 + 26 + 2 + csv.length + 2;
  return s.slice(at, at + 808);
}

const base = { date: when, from: 'KE7KDQ', mbo: 'KE7KDQ', to: ['someone@example.com'] };

const cases: Array<[string, B2fMessage]> = [
  ['plain', { ...base, mid: 'CAP7WRFXGXV5', subject: 'Plain test message',
    body: 'Shelter count at 1400: 42 adults, 7 children.\nNeeds: water, cots.\n' }],
  ['accented', { ...base, mid: 'U4UXATUVSJY7', subject: 'Accented test é',
    body: 'Contact: José Ñúñez, café on 3rd Ave. Temp 21°C. R&R <ok> =41\n' }],
  ['long-line', { ...base, mid: '5QOQKIPH2R4H', subject: 'Long line test',
    body: 'Long line follows:\n' + 'word '.repeat(80) + '\nend\n' }],
  ['several-recipients-cc', { ...base, mid: 'KB7BWMEBA6W2', subject: 'Several recipients',
    to: ['KE7KDQ', 'EOC-NORTH', 'other@example.org'], cc: ['test@example.com', 'EOC-TEST'],
    body: 'Net check-in list attached later.\n' }],
  ['attachments-csv-png', { ...base, mid: 'AF32NVLERYFT', subject: 'Attachment test',
    body: 'Roster and map attached.\n',
    attachments: [{ name: 'roster.csv', bytes: csv }, { name: 'dot.jpg', bytes: jpg() }] }],
  ['tactical-p2p', { ...base, mid: '6HBOUHPIPATW', subject: 'Tactical P2P test', from: 'EOC-TEST',
    to: ['KE7KDQ'], body: 'P2P only, tactical sender.\n', p2pOnly: true }],
];

describe('writeB2f golden tests (Pat 1.0.1)', () => {
  for (const [name, msg] of cases) {
    it(`matches the real file byte for byte: ${name}`, () => {
      const out = writeB2f(msg);
      expect(Buffer.from(out).equals(Buffer.from(sample(name)))).toBe(true);
    });
    it(`passes check() with zero issues: ${name}`, () => {
      const r = check(writeB2f(msg), `${name}.b2f`);
      expect(r.issues.map(formatIssue)).toEqual([]);
    });
  }
  it('the attachment sample has the sizes the headers claim', () => {
    expect(csv.length).toBe(28);
    expect(jpg().length).toBe(808);
  });
});

describe('writeB2f details', () => {
  const m: B2fMessage = { ...cases[0]![1], mid: 'ABC123' };
  const out = (o: Partial<B2fMessage>): string => text(writeB2f({ ...m, ...o }));
  it('writes the date from a Date in UTC, or a ready string', () => {
    expect(out({})).toContain('\r\nDate: 2026/11/17 06:06\r\n');
    expect(out({ date: '2026/01/02 03:04' })).toContain('Date: 2026/01/02 03:04\r\n');
    expect(() => out({ date: '2026-01-02' })).toThrow(RangeError);
  });
  it('empty body: Body 0, ends at the blank line, no trailing CRLF', () => {
    const s = out({ body: '' });
    expect(s).toContain('Body: 0\r\n');
    expect(s.endsWith('Type: Private\r\n\r\n')).toBe(true);
    expect(check(writeB2f({ ...m, body: '' }), 'x.b2f').issues).toEqual([]);
  });
  it('normalises CRLF, LF and CR bodies to the same bytes', () => {
    const a = out({ body: 'a\r\nb\r\n' });
    expect(out({ body: 'a\nb\n' })).toBe(a);
    expect(out({ body: 'a\rb\r' })).toBe(a);
    expect(a).toContain('Body: 6\r\n');
  });
  it('counts Body in Latin-1 bytes, not UTF-16 or UTF-8', () => {
    const b = writeB2f({ ...m, body: 'éé' });
    expect(text(b)).toContain('Body: 2\r\n');
    expect(b[b.length - 1]).toBe(0xe9);
  });
  it('throws on characters outside Latin-1 (body and subject), never folds', () => {
    expect(() => writeB2f({ ...m, body: 'price €5' })).toThrow(RangeError);
    expect(() => writeB2f({ ...m, subject: 'ok €' })).toThrow(RangeError);
  });
  it('keeps plain subjects as they are, including ? and =', () => {
    expect(out({ subject: 'a=b? c_d' })).toContain('Subject: a=b? c_d\r\n');
  });
  it('encodes accented subjects: space is _, = ? _ are escaped, hex is uppercase', () => {
    expect(out({ subject: 'café =?_' })).toContain('Subject: =?ISO-8859-1?q?caf=E9_=3D=3F=5F?=\r\n');
  });
  it('splits a long encoded subject into words of at most 75 characters', () => {
    const line = out({ subject: 'é'.repeat(60) }).split('\r\n').find((l) => l.startsWith('Subject: '))!;
    const words = line.slice(9).split(' ');
    expect(words.length).toBeGreaterThan(1);
    for (const w of words) {
      expect(w.length).toBeLessThanOrEqual(75);
      expect(w).toMatch(/^=\?ISO-8859-1\?q\?(=E9)+\?=$/);
    }
    expect(words.join('').match(/=E9/g)!.length).toBe(60);
  });
  it('prefixes internet addresses with SMTP: once, leaves call signs and tactical bare', () => {
    const s = out({ to: ['a@b.com', 'SMTP:c@d.com', 'smtp:e@f.com', 'EOC-1'] });
    expect(s).toContain('To: SMTP:a@b.com\r\nTo: SMTP:c@d.com\r\nTo: SMTP:e@f.com\r\nTo: EOC-1\r\n');
  });
  it('makes a mid from injected random bytes, and needs one or the other', () => {
    const { mid: _mid, ...nomid } = m;
    const s = text(writeB2f({ ...nomid, randomBytes: (n) => new Uint8Array(n) }));
    expect(s.startsWith('Mid: AAAAAAAAAAAA\r\n')).toBe(true);
    expect(() => writeB2f(nomid)).toThrow(TypeError);
  });
  it('rejects bad input: line breaks in headers, no recipients, bad mid', () => {
    expect(() => out({ subject: 'a\nb' })).toThrow(RangeError);
    expect(() => out({ from: 'A\r\nB' })).toThrow(RangeError);
    expect(() => out({ to: [] })).toThrow(RangeError);
    expect(() => out({ mid: 'TOOLONGMIDVALUE' })).toThrow(RangeError);
  });
  it('writes attachment bytes untouched, even CRLF-looking and 8-bit ones', () => {
    const bytes = Uint8Array.from([0, 10, 13, 10, 255, 0x80]);
    const b = writeB2f({ ...m, attachments: [{ name: 'x.bin', bytes }] });
    expect(text(b)).toContain('File: 6 x.bin\r\n');
    expect([...b.slice(b.length - 8)]).toEqual([...bytes, 13, 10]);
  });
});
