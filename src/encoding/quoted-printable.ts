// Quoted-Printable per RFC 2045 section 6.7.

const HEX = '0123456789ABCDEF';
const MAX_LINE = 76;

export interface QuotedPrintableOptions {
  /** Line break written for hard and soft breaks. Default CRLF. */
  eol?: '\r\n' | '\n';
}

function token(b: number): string {
  if ((b >= 33 && b <= 60) || (b >= 62 && b <= 126)) return String.fromCharCode(b);
  return '=' + HEX[b >> 4] + HEX[b & 15];
}

/** Encode one hard line (no line breaks inside) into soft-wrapped output lines. */
function encodeLine(line: number[], eol: string): string {
  const toks: string[] = line.map((b, i) => {
    if ((b === 32 || b === 9) && i < line.length - 1) return String.fromCharCode(b);
    return token(b); // includes a trailing space/tab, which must be encoded
  });
  // suffix[i] = length of everything from token i onward
  const suffix = new Array<number>(toks.length + 1).fill(0);
  for (let i = toks.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1]! + toks[i]!.length;
  let out = '';
  let cur = '';
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!;
    if (cur.length + suffix[i]! <= MAX_LINE) {
      cur += toks.slice(i).join('');
      break;
    }
    if (cur.length + t.length > MAX_LINE - 1) {
      out += cur + '=' + eol;
      cur = t;
    } else cur += t;
  }
  return out + cur;
}

/**
 * Encode bytes as Quoted-Printable. CRLF and lone LF in the input are hard line
 * breaks; a lone CR is data and is encoded as =0D. No output line exceeds 76 characters.
 */
export function encodeQuotedPrintable(bytes: Uint8Array, opts?: QuotedPrintableOptions): string {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('encodeQuotedPrintable: expected a Uint8Array');
  const eol = opts?.eol ?? '\r\n';
  if (eol !== '\r\n' && eol !== '\n') throw new RangeError("encodeQuotedPrintable: eol must be '\\r\\n' or '\\n'");
  const lines: number[][] = [[]];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    if (b === 10) lines.push([]);
    else if (b === 13 && bytes[i + 1] === 10) {
      lines.push([]);
      i++;
    } else lines[lines.length - 1]!.push(b);
  }
  return lines.map((l) => encodeLine(l, eol)).join(eol);
}

function hexVal(c: string | undefined): number {
  if (c === undefined || '0123456789ABCDEFabcdef'.indexOf(c) < 0) return -1;
  return parseInt(c, 16);
}

/**
 * Decode Quoted-Printable text. Strict: a "=" not followed by two hex digits or a
 * line break, and any character outside printable ASCII (other than tab, CR, LF),
 * throws RangeError. Lowercase hex is accepted. Hard line breaks in the text come
 * out as they are (CRLF or LF).
 */
export function decodeQuotedPrintable(s: string): Uint8Array {
  if (typeof s !== 'string') throw new TypeError('decodeQuotedPrintable: expected a string');
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 126 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) {
      throw new RangeError(`decodeQuotedPrintable: invalid character U+${c.toString(16).toUpperCase().padStart(4, '0')} at ${i}`);
    }
    if (c !== 61) {
      out.push(c);
      continue;
    }
    if (s[i + 1] === '\n') i += 1;
    else if (s[i + 1] === '\r' && s[i + 2] === '\n') i += 2;
    else {
      const h = hexVal(s[i + 1]);
      const l = hexVal(s[i + 2]);
      if (h < 0 || l < 0) throw new RangeError(`decodeQuotedPrintable: malformed "=" sequence at ${i}`);
      out.push(h * 16 + l);
      i += 2;
    }
  }
  return Uint8Array.from(out);
}
