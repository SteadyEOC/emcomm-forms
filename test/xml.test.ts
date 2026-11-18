import { describe, expect, it } from 'vitest';
import { escapeXmlAttr, escapeXmlText, isXmlChar } from '../src/index.js';

describe('isXmlChar', () => {
  it('follows the XML 1.0 Char production', () => {
    for (const cp of [0x9, 0xa, 0xd, 0x20, 0x41, 0xd7ff, 0xe000, 0xfffd, 0x10000, 0x10ffff]) {
      expect(isXmlChar(cp), cp.toString(16)).toBe(true);
    }
    for (const cp of [0x0, 0x8, 0xb, 0xc, 0xe, 0x1f, 0xd800, 0xdfff, 0xfffe, 0xffff, 0x110000, -1]) {
      expect(isXmlChar(cp), cp.toString(16)).toBe(false);
    }
  });
});

describe('escapeXmlText', () => {
  it('escapes & < >', () => {
    expect(escapeXmlText('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });
  it('escapes & first, once', () => {
    expect(escapeXmlText('&lt;')).toBe('&amp;lt;');
  });
  it('leaves quotes, tab, CR, LF and non-ASCII', () => {
    expect(escapeXmlText('"\'\t\r\né😀')).toBe('"\'\t\r\né😀');
  });
  it('throws on forbidden characters', () => {
    for (const bad of ['\u0000', '\u0008', '\u000b', '\u001f', '￾', '￿', 'a\ud800', '\udc00b']) {
      expect(() => escapeXmlText(bad), JSON.stringify(bad)).toThrow(RangeError);
    }
  });
  it('throws on non-strings', () => {
    expect(() => escapeXmlText(1 as unknown as string)).toThrow(TypeError);
  });
});

describe('escapeXmlAttr', () => {
  it('escapes & < > " and apostrophe', () => {
    expect(escapeXmlAttr(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
  it('throws on forbidden characters', () => {
    for (const bad of ['\u0000', '\u0001', '￾', '￿', '\ud83d']) {
      expect(() => escapeXmlAttr(bad), JSON.stringify(bad)).toThrow(RangeError);
    }
  });
  it('accepts a valid surrogate pair', () => {
    expect(escapeXmlAttr('😀')).toBe('😀');
  });
  it('throws on non-strings', () => {
    expect(() => escapeXmlAttr(null as unknown as string)).toThrow(TypeError);
  });
});
