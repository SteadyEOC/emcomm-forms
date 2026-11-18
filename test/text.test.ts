import { describe, expect, it } from 'vitest';
import { asciiFold, normaliseLineEndings, wrapText } from '../src/index.js';

describe('asciiFold', () => {
  it('drops accents', () => {
    expect(asciiFold('José')).toBe('Jose');
    expect(asciiFold('Crème brûlée, Zoë, Škoda, Ñandú')).toBe('Creme brulee, Zoe, Skoda, Nandu');
  });
  it('maps letters NFKD does not decompose', () => {
    expect(asciiFold('Straße')).toBe('Strasse');
    expect(asciiFold('æÆœŒ')).toBe('aeAEoeOE');
    expect(asciiFold('øØłŁđĐ')).toBe('oOlLdD');
    expect(asciiFold('þÞ')).toBe('thTh');
  });
  it('maps quotes, dashes, ellipsis', () => {
    expect(asciiFold('‘a’ “b”')).toBe('\'a\' "b"');
    expect(asciiFold('a–b—c−d')).toBe('a-b-c-d');
    expect(asciiFold('wait…')).toBe('wait...');
  });
  it('maps Unicode spaces to a space', () => {
    expect(asciiFold('a b c d　e')).toBe('a b c d e');
  });
  it('replaces the rest with one ? per code point', () => {
    expect(asciiFold('日本')).toBe('??');
    expect(asciiFold('a😀b')).toBe('a?b');
    expect(asciiFold('a\ud800b')).toBe('a?b');
  });
  it('keeps ASCII, tab, CR, LF', () => {
    expect(asciiFold('a\tb\r\nc')).toBe('a\tb\r\nc');
  });
  it('compatibility forms fold: fullwidth and ligature', () => {
    expect(asciiFold('ＡＢ ﬁ')).toBe('AB fi');
  });
  it('rejects non-strings', () => {
    expect(() => asciiFold(5 as unknown as string)).toThrow(TypeError);
  });
});

describe('normaliseLineEndings', () => {
  it('converts all kinds to CRLF by default', () => {
    expect(normaliseLineEndings('a\r\nb\rc\nd')).toBe('a\r\nb\r\nc\r\nd');
  });
  it('does not double a CRLF', () => {
    expect(normaliseLineEndings('a\r\n\r\nb', '\n')).toBe('a\n\nb');
  });
  it('accepts any eol string, including a replacement-pattern lookalike', () => {
    expect(normaliseLineEndings('a\nb', '$&')).toBe('a$&b');
  });
  it('throws on wrong types', () => {
    expect(() => normaliseLineEndings(1 as unknown as string)).toThrow(TypeError);
    expect(() => normaliseLineEndings('a', 1 as unknown as string)).toThrow(TypeError);
  });
});

describe('wrapText', () => {
  it('wraps greedily at the width', () => {
    expect(wrapText('aaa bbb ccc ddd', { width: 7, eol: '\n' })).toBe('aaa bbb\nccc ddd');
  });
  it('uses CRLF and width 72 by default', () => {
    const words = Array.from({ length: 40 }, () => 'word').join(' ');
    const out = wrapText(words);
    expect(out).toContain('\r\n');
    for (const l of out.split('\r\n')) expect(l.length).toBeLessThanOrEqual(72);
    expect(out.replace(/\r\n/g, ' ')).toBe(words);
  });
  it('keeps existing breaks and blank lines, any input eol', () => {
    expect(wrapText('a\r\n\r\nb\rc\n', { eol: '\n' })).toBe('a\n\nb\nc\n');
  });
  it('trims trailing spaces and tabs', () => {
    expect(wrapText('a  \t\nb ', { eol: '\n' })).toBe('a\nb');
  });
  it('hard-breaks long words', () => {
    expect(wrapText('abcdefghij', { width: 4, eol: '\n' })).toBe('abcd\nefgh\nij');
    expect(wrapText('x abcdefghij y', { width: 4, eol: '\n' })).toBe('x\nabcd\nefgh\nij y');
  });
  it('keeps a long line indent on the first line and never exceeds the width', () => {
    const out = wrapText('    aaa bbb ccc', { width: 8, eol: '\n' });
    expect(out).toBe('    aaa\nbbb ccc');
  });
  it('does not split a surrogate pair', () => {
    const out = wrapText('a😀😀😀', { width: 3, eol: '\n' });
    for (const l of out.split('\n')) expect(l.length).toBeLessThanOrEqual(3);
    expect(out.replace(/\n/g, '')).toBe('a😀😀😀');
    expect(out).not.toMatch(/[\ud800-\udbff]\n/);
  });
  it('never exceeds the width on mixed input', () => {
    const text = 'The quick brown fox jumps over the lazy dog '.repeat(20) + 'x'.repeat(200);
    for (const width of [1, 2, 10, 33, 72]) {
      for (const l of wrapText(text, { width, eol: '\n' }).split('\n')) {
        expect(l.length).toBeLessThanOrEqual(width);
      }
    }
  });
  it('throws on a bad width, eol or input', () => {
    expect(() => wrapText('a', { width: 0 })).toThrow(RangeError);
    expect(() => wrapText('a', { width: 2.5 })).toThrow(RangeError);
    expect(() => wrapText('a', { eol: 1 as unknown as string })).toThrow(TypeError);
    expect(() => wrapText(1 as unknown as string)).toThrow(TypeError);
  });
});
