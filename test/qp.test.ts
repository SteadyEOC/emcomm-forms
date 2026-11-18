import { describe, expect, it } from 'vitest';
import { decodeQuotedPrintable, encodeLatin1, encodeQuotedPrintable, encodeUtf8 } from '../src/index.js';

const enc = (s: string, eol?: '\r\n' | '\n') => encodeQuotedPrintable(encodeUtf8(s), eol ? { eol } : undefined);
const bytesOf = (s: string) => [...Buffer.from(s, 'latin1')];

/** Every line obeys RFC 2045: at most 76 chars, no trailing whitespace, whole =XX triplets only. */
function expectWellFormed(out: string): void {
  for (const line of out.split(/\r\n|\n/)) {
    expect(line.length).toBeLessThanOrEqual(76);
    expect(line).toMatch(/^(?:[\x21-\x3c\x3e-\x7e \t]|=[0-9A-F]{2})*=?$/);
    expect(line).not.toMatch(/[ \t]$/);
  }
}

describe('encodeQuotedPrintable', () => {
  it('leaves printable ASCII alone', () => {
    expect(enc('Hello, World!')).toBe('Hello, World!');
  });
  it('encodes = as =3D, and "=41" is not a letter', () => {
    expect(enc('=')).toBe('=3D');
    expect(enc('=41')).toBe('=3D41');
  });
  it('uses uppercase hex', () => {
    expect(encodeQuotedPrintable(Uint8Array.of(0xff, 0xab, 0x00))).toBe('=FF=AB=00');
  });
  it('encodes José in UTF-8 and Latin-1', () => {
    expect(enc('José')).toBe('Jos=C3=A9');
    expect(encodeQuotedPrintable(encodeLatin1('José'))).toBe('Jos=E9');
  });
  it('keeps internal spaces and tabs literal', () => {
    expect(enc('a b\tc')).toBe('a b\tc');
  });
  it('encodes trailing space/tab before a line break and at end of input', () => {
    expect(enc('a \r\nb\t\r\nc ')).toBe('a=20\r\nb=09\r\nc=20');
    expect(enc(' ')).toBe('=20');
    expect(enc('a  ')).toBe('a =20');
  });
  it('treats CRLF and lone LF as hard breaks, with the chosen eol', () => {
    expect(enc('a\r\nb\nc')).toBe('a\r\nb\r\nc');
    expect(enc('a\r\nb\nc', '\n')).toBe('a\nb\nc');
    expect(enc('a\r\n')).toBe('a\r\n');
    expect(enc('\r\n\r\n')).toBe('\r\n\r\n');
  });
  it('encodes a lone CR as =0D', () => {
    expect(enc('a\rb')).toBe('a=0Db');
    expect(enc('a\r')).toBe('a=0D');
  });
  it('encodes empty input as empty', () => {
    expect(encodeQuotedPrintable(new Uint8Array())).toBe('');
  });
  it('allows exactly 76 characters on a line and soft-breaks the 77th', () => {
    expect(enc('x'.repeat(76))).toBe('x'.repeat(76));
    expect(enc('x'.repeat(77))).toBe('x'.repeat(75) + '=\r\nxx');
  });
  it('wraps a 300-character line within 76 and decodes back', () => {
    const text = 'abcdefghij'.repeat(30);
    const out = enc(text);
    expectWellFormed(out);
    expect(out.split('\r\n').length).toBeGreaterThan(3);
    expect(out.replace(/=\r\n/g, '')).toBe(text);
    expect(Buffer.from(decodeQuotedPrintable(out)).toString('utf8')).toBe(text);
  });
  it('never splits an =XX triplet, whatever the offset', () => {
    for (let pad = 70; pad < 80; pad++) {
      const out = enc('x'.repeat(pad) + 'é'.repeat(30) + '=' + ' '.repeat(5));
      expectWellFormed(out);
      expect(Buffer.from(decodeQuotedPrintable(out)).toString('utf8')).toBe('x'.repeat(pad) + 'é'.repeat(30) + '=' + ' '.repeat(5));
    }
  });
  it('wraps with a bare LF eol', () => {
    const out = enc('y'.repeat(200), '\n');
    expect(out).not.toContain('\r');
    expectWellFormed(out);
  });
  it('round-trips random bytes (lone LF comes back as CRLF)', () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >>> 8;
    for (let n = 0; n < 200; n++) {
      const bytes = Uint8Array.from({ length: rnd() % 400 }, () => {
        const r = rnd() % 10;
        return r === 0 ? 32 : r === 1 ? 13 : r === 2 ? 10 : r === 3 ? 61 : rnd() % 256;
      });
      const out = encodeQuotedPrintable(bytes);
      expectWellFormed(out);
      const expected = bytesOf(Buffer.from(bytes).toString('latin1').replace(/\r\n|\n/g, '\r\n'));
      expect([...decodeQuotedPrintable(out)]).toEqual(expected);
    }
  });
  it('throws on a bad eol and non-bytes', () => {
    expect(() => encodeQuotedPrintable(new Uint8Array(), { eol: '\r' as '\n' })).toThrow(RangeError);
    expect(() => encodeQuotedPrintable('abc' as unknown as Uint8Array)).toThrow(TypeError);
  });
});

describe('decodeQuotedPrintable', () => {
  it('decodes =XX, either case', () => {
    expect([...decodeQuotedPrintable('Jos=C3=A9')]).toEqual([0x4a, 0x6f, 0x73, 0xc3, 0xa9]);
    expect([...decodeQuotedPrintable('=c3=a9')]).toEqual([0xc3, 0xa9]);
    expect([...decodeQuotedPrintable('=3D41')]).toEqual([0x3d, 0x34, 0x31]);
  });
  it('removes soft line breaks (CRLF or LF)', () => {
    expect(Buffer.from(decodeQuotedPrintable('ab=\r\ncd=\nef')).toString()).toBe('abcdef');
  });
  it('keeps hard line breaks as they are', () => {
    expect(Buffer.from(decodeQuotedPrintable('a\r\nb\nc')).toString()).toBe('a\r\nb\nc');
  });
  it('throws on a malformed = sequence', () => {
    expect(() => decodeQuotedPrintable('=')).toThrow(RangeError);
    expect(() => decodeQuotedPrintable('a=4')).toThrow(RangeError);
    expect(() => decodeQuotedPrintable('=ZZ')).toThrow(RangeError);
    expect(() => decodeQuotedPrintable('=4G')).toThrow(RangeError);
    expect(() => decodeQuotedPrintable('= 41')).toThrow(RangeError);
    expect(() => decodeQuotedPrintable('=\r')).toThrow(RangeError);
  });
  it('throws on non-ASCII and control characters', () => {
    expect(() => decodeQuotedPrintable('é')).toThrow(RangeError);
    expect(() => decodeQuotedPrintable('a\u0000')).toThrow(RangeError);
    expect(() => decodeQuotedPrintable('a\u007f')).toThrow(RangeError);
  });
  it('throws on non-strings', () => {
    expect(() => decodeQuotedPrintable(1 as unknown as string)).toThrow(TypeError);
  });
});
