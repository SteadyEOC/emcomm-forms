// Byte and text helpers for the checker. The core has no TextDecoder or atob in its
// type library (rule 5: plain ES2022), so these are written out.

export interface Utf8Result {
  text: string;
  /** Byte offset of the first invalid sequence, or -1 when the bytes are valid UTF-8. */
  badAt: number;
}

/** Strict UTF-8 decode (no overlongs, no surrogates, max U+10FFFF). Bad bytes become U+FFFD. */
export function decodeUtf8(bytes: Uint8Array): Utf8Result {
  const cps: number[] = [];
  let badAt = -1;
  const n = bytes.length;
  let i = 0;
  const bad = () => {
    if (badAt < 0) badAt = i;
    cps.push(0xfffd);
    i += 1;
  };
  const cont = (k: number, lo = 0x80, hi = 0xbf) => {
    const b = bytes[i + k];
    return b !== undefined && b >= lo && b <= hi;
  };
  while (i < n) {
    const b = bytes[i]!;
    if (b < 0x80) {
      cps.push(b);
      i += 1;
    } else if (b >= 0xc2 && b <= 0xdf) {
      if (!cont(1)) { bad(); continue; }
      cps.push(((b & 0x1f) << 6) | (bytes[i + 1]! & 0x3f));
      i += 2;
    } else if (b >= 0xe0 && b <= 0xef) {
      const lo = b === 0xe0 ? 0xa0 : 0x80;
      const hi = b === 0xed ? 0x9f : 0xbf;
      if (!cont(1, lo, hi) || !cont(2)) { bad(); continue; }
      cps.push(((b & 0x0f) << 12) | ((bytes[i + 1]! & 0x3f) << 6) | (bytes[i + 2]! & 0x3f));
      i += 3;
    } else if (b >= 0xf0 && b <= 0xf4) {
      const lo = b === 0xf0 ? 0x90 : 0x80;
      const hi = b === 0xf4 ? 0x8f : 0xbf;
      if (!cont(1, lo, hi) || !cont(2) || !cont(3)) { bad(); continue; }
      cps.push(
        ((b & 0x07) << 18) | ((bytes[i + 1]! & 0x3f) << 12) | ((bytes[i + 2]! & 0x3f) << 6) | (bytes[i + 3]! & 0x3f),
      );
      i += 4;
    } else {
      bad();
    }
  }
  let text = '';
  for (let k = 0; k < cps.length; k += 8192) text += String.fromCodePoint(...cps.slice(k, k + 8192));
  return { text, badAt };
}

/** ISO-8859-1: every byte is the code point of the same number. */
export function decodeLatin1(bytes: Uint8Array): string {
  let s = '';
  for (let k = 0; k < bytes.length; k += 8192) s += String.fromCharCode(...bytes.subarray(k, k + 8192));
  return s;
}

/** True when the bytes hold non-ASCII and are valid UTF-8, i.e. probably UTF-8 text. */
export function looksLikeUtf8(bytes: Uint8Array): boolean {
  return bytes.some((b) => b >= 0x80) && decodeUtf8(bytes).badAt < 0;
}

export function hasNonAscii(bytes: Uint8Array): boolean {
  return bytes.some((b) => b >= 0x80);
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode base64, ignoring line breaks and spaces. Returns null if it isn't valid base64. */
export function decodeBase64(s: string): Uint8Array | null {
  const t = s.replace(/[\r\n\t ]/g, '');
  if (t.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(t)) return null;
  const pad = t.endsWith('==') ? 2 : t.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((t.length / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < t.length; i += 4) {
    const v =
      (B64.indexOf(t[i]!) << 18) |
      (B64.indexOf(t[i + 1]!) << 12) |
      ((t[i + 2] === '=' ? 0 : B64.indexOf(t[i + 2]!)) << 6) |
      (t[i + 3] === '=' ? 0 : B64.indexOf(t[i + 3]!));
    if (o < out.length) out[o++] = (v >> 16) & 0xff;
    if (o < out.length) out[o++] = (v >> 8) & 0xff;
    if (o < out.length) out[o++] = v & 0xff;
  }
  return out;
}

/** Returns a function from a string offset to its 1-based line number. */
export function lineIndex(text: string): (offset: number) => number {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** Line numbers (1-based) holding a bare LF, i.e. an LF without a CR before it. */
export function bareLfLines(text: string): number[] {
  const out: number[] = [];
  let line = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      if (text.charCodeAt(i - 1) !== 13) out.push(line);
      line += 1;
    }
  }
  return out;
}

export function describeLines(lines: number[]): string {
  const shown = lines.slice(0, 5).join(', ');
  return lines.length > 5 ? `${shown} and ${lines.length - 5} more` : shown;
}
