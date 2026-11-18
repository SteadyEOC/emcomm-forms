import { describe, expect, it } from 'vitest';
import { byteLength, encodeAscii, encodeLatin1, encodeUtf8 } from '../src/index.js';

const samples = ['', 'plain', 'José', 'Straße', '€ 5', '日本語', 'a😀b', '\u0000\u007f\u0080߿ࠀ￿', 'ÿ'];

describe('encodeUtf8', () => {
  it('matches Node Buffer', () => {
    for (const s of samples) expect([...encodeUtf8(s)]).toEqual([...Buffer.from(s, 'utf8')]);
  });
  it('encodes José as 4A 6F 73 C3 A9', () => {
    expect([...encodeUtf8('José')]).toEqual([0x4a, 0x6f, 0x73, 0xc3, 0xa9]);
  });
  it('throws on lone surrogates', () => {
    expect(() => encodeUtf8('a\ud800')).toThrow(RangeError);
    expect(() => encodeUtf8('\udc00')).toThrow(RangeError);
  });
  it('throws on non-strings', () => {
    expect(() => encodeUtf8(1 as unknown as string)).toThrow(TypeError);
  });
});

describe('encodeLatin1', () => {
  it('matches Node Buffer for Latin-1 text', () => {
    for (const s of ['', 'José', 'ÿ', '\u0000\u007f\u0080ÿ']) {
      expect([...encodeLatin1(s)]).toEqual([...Buffer.from(s, 'latin1')]);
    }
  });
  it('throws by default on characters above U+00FF', () => {
    expect(() => encodeLatin1('€')).toThrow(RangeError);
    expect(() => encodeLatin1('a😀')).toThrow(RangeError);
    expect(() => encodeLatin1('\ud800')).toThrow(RangeError);
  });
  it('replaces with ? (one per code point) on request', () => {
    expect([...encodeLatin1('a€😀é', { unmappable: 'replace' })]).toEqual([0x61, 0x3f, 0x3f, 0xe9]);
  });
  it('rejects a bad option and non-strings', () => {
    expect(() => encodeLatin1('a', { unmappable: 'x' as 'throw' })).toThrow(RangeError);
    expect(() => encodeLatin1(1 as unknown as string)).toThrow(TypeError);
  });
});

describe('encodeAscii', () => {
  it('matches Node Buffer for ASCII text', () => {
    expect([...encodeAscii('Hello\r\n~')]).toEqual([...Buffer.from('Hello\r\n~', 'ascii')]);
  });
  it('throws on a character above 127', () => {
    expect(() => encodeAscii('é')).toThrow(RangeError);
  });
  it('replaces with ? on request', () => {
    expect([...encodeAscii('éa', { unmappable: 'replace' })]).toEqual([0x3f, 0x61]);
  });
  it('rejects non-strings', () => {
    expect(() => encodeAscii(null as unknown as string)).toThrow(TypeError);
  });
});

describe('byteLength', () => {
  it('matches Node for each charset', () => {
    for (const s of samples) expect(byteLength(s, 'utf-8')).toBe(Buffer.byteLength(s, 'utf8'));
    expect(byteLength('José', 'iso-8859-1')).toBe(4);
    expect(byteLength('José', 'utf-8')).toBe(5);
    expect(byteLength('Jose', 'us-ascii')).toBe(4);
  });
  it('throws where the encoder would, and on an unknown charset', () => {
    expect(() => byteLength('é', 'us-ascii')).toThrow(RangeError);
    expect(() => byteLength('€', 'iso-8859-1')).toThrow(RangeError);
    expect(() => byteLength('\ud800', 'utf-8')).toThrow(RangeError);
    expect(() => byteLength('a', 'koi8' as 'utf-8')).toThrow(RangeError);
  });
});
