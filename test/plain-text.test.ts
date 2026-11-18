import { describe, expect, it } from 'vitest';
import { writePlainText } from '../src/index.js';

const CRLF = '\r\n';

describe('writePlainText', () => {
  it('writes title, fields and body with blank lines between, CRLF, no final newline', () => {
    const r = writePlainText({
      title: 'GENERAL MESSAGE (ICS 213)',
      fields: [
        { label: '1. Incident Name', value: 'Exercise Cascade Quake' },
        { label: '4. Subject', value: 'Cots and water needed' },
      ],
      body: 'Please send 20 cots.',
    });
    expect(r.text).toBe(
      ['GENERAL MESSAGE (ICS 213)', '', '1. Incident Name: Exercise Cascade Quake', '4. Subject: Cots and water needed', '', 'Please send 20 cots.'].join(CRLF),
    );
    expect(r.folded).toBe(false);
    expect(new TextDecoder().decode(r.bytes)).toBe(r.text);
  });

  it('puts a long or multi-line value under its label, indented, wrapped within the width', () => {
    const long = 'word '.repeat(30).trim();
    const r = writePlainText({ fields: [{ label: '7. Message', value: `${long}\n\nsecond paragraph` }] }, { width: 40 });
    const ls = r.text.split(CRLF);
    expect(ls[0]).toBe('7. Message:');
    expect(ls.slice(1).every((l) => l === '' || l.startsWith('  '))).toBe(true);
    expect(Math.max(...ls.map((l) => l.length))).toBeLessThanOrEqual(40);
    expect(ls).toContain('');
    expect(ls[ls.length - 1]).toBe('  second paragraph');
  });

  it('writes an empty value as a bare label', () => {
    expect(writePlainText({ fields: [{ label: 'Approved by', value: '' }] }).text).toBe('Approved by:');
  });

  it('wraps the body at 72 by default and trims trailing spaces', () => {
    const r = writePlainText({ body: `${'abcdefghi '.repeat(10)}   \nnext   ` });
    expect(r.text.split(CRLF).every((l) => l.length <= 72 && !/ $/.test(l))).toBe(true);
    expect(r.text.endsWith('next')).toBe(true);
  });

  it('folds to US-ASCII by default and says so', () => {
    const r = writePlainText({ body: 'José “quoted” — café' });
    expect(r.text).toBe('Jose "quoted" - cafe');
    expect(r.folded).toBe(true);
    expect([...r.bytes].every((b) => b < 0x80)).toBe(true);
  });

  it('keeps Latin-1 letters in iso-8859-1 and folds the rest', () => {
    const r = writePlainText({ body: 'José — 日' }, { charset: 'iso-8859-1' });
    expect(r.text).toBe('José - ?');
    expect(r.bytes[3]).toBe(0xe9);
    expect(r.folded).toBe(true);
  });

  it('keeps everything in utf-8, normalised to NFC', () => {
    const r = writePlainText({ body: 'José 日本' }, { charset: 'utf-8' });
    expect(r.text).toBe('José 日本');
    expect(r.folded).toBe(false);
  });

  it('accepts another line ending', () => {
    expect(writePlainText({ title: 'T', body: 'b' }, { eol: '\n' }).text).toBe('T\n\nb');
  });

  it('refuses bad input', () => {
    expect(() => writePlainText({ body: 3 as unknown as string })).toThrow(TypeError);
    expect(() => writePlainText({ fields: [{ label: 'x', value: null as unknown as string }] })).toThrow(/fields\[0\]\.value/);
    expect(() => writePlainText({ body: 'x' }, { width: 5 })).toThrow(RangeError);
    expect(() => writePlainText({ body: 'x' }, { charset: 'utf-16' as 'utf-8' })).toThrow(RangeError);
  });
});
