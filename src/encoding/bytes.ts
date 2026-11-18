export type Charset = 'utf-8' | 'iso-8859-1' | 'us-ascii';
export interface EncodeOptions {
  /** What to do with a character the charset cannot hold. Default 'throw'. */
  unmappable?: 'throw' | 'replace';
}

function checkString(s: unknown, who: string): asserts s is string {
  if (typeof s !== 'string') throw new TypeError(`${who}: expected a string`);
}

function isSurrogate(cp: number): boolean {
  return cp >= 0xd800 && cp <= 0xdfff;
}

const hex = (cp: number): string => cp.toString(16).toUpperCase().padStart(4, '0');

/** UTF-8 bytes of a string. A lone surrogate throws RangeError. */
export function encodeUtf8(s: string): Uint8Array {
  checkString(s, 'encodeUtf8');
  const out: number[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (isSurrogate(cp)) throw new RangeError(`encodeUtf8: lone surrogate U+${hex(cp)}`);
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return Uint8Array.from(out);
}

function encodeSingleByte(s: string, max: number, name: string, opts?: EncodeOptions): Uint8Array {
  checkString(s, name);
  const mode = opts?.unmappable ?? 'throw';
  if (mode !== 'throw' && mode !== 'replace') {
    throw new RangeError(`${name}: unmappable must be 'throw' or 'replace'`);
  }
  const out: number[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp <= max) out.push(cp);
    else if (mode === 'replace') out.push(0x3f);
    else throw new RangeError(`${name}: U+${hex(cp)} cannot be encoded`);
  }
  return Uint8Array.from(out);
}

/** ISO-8859-1 bytes. Characters above U+00FF throw, or become "?" with `unmappable: 'replace'`. */
export function encodeLatin1(s: string, opts?: EncodeOptions): Uint8Array {
  return encodeSingleByte(s, 0xff, 'encodeLatin1', opts);
}

/** US-ASCII bytes. Characters above U+007F throw, or become "?" with `unmappable: 'replace'`. */
export function encodeAscii(s: string, opts?: EncodeOptions): Uint8Array {
  return encodeSingleByte(s, 0x7f, 'encodeAscii', opts);
}

/** Number of bytes `s` takes in the charset (strict: throws where the encoder would). */
export function byteLength(s: string, charset: Charset): number {
  switch (charset) {
    case 'utf-8': return encodeUtf8(s).length;
    case 'iso-8859-1': return encodeLatin1(s).length;
    case 'us-ascii': return encodeAscii(s).length;
    default: throw new RangeError(`byteLength: unknown charset ${String(charset)}`);
  }
}
