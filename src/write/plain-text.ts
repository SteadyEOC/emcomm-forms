// Plain text for any client's compose window (and for clients without forms): a title, labelled
// fields, then free text, wrapped to 72 columns with CRLF line ends, in a charset every client can
// send. This is our own neutral layout, not a copy of any form's text: a form's own message text
// (what Winlink Express puts in the body) depends on the template and comes with phase 2.

import { encodeAscii, encodeLatin1, encodeUtf8, type Charset } from '../encoding/bytes.js';
import { asciiFold } from '../text/ascii-fold.js';
import { wrapText } from '../text/layout.js';

export interface PlainTextField {
  /** Label as the reader should see it, e.g. `4. Subject`. */
  label: string;
  /** Value; may hold line breaks. */
  value: string;
}

export interface PlainTextMessage {
  /** Heading line, e.g. `GENERAL MESSAGE (ICS 213)`. */
  title?: string;
  /** Labelled fields, one `Label: value` each, in order. */
  fields?: readonly PlainTextField[];
  /** Free text after the fields (after a blank line). */
  body?: string;
}

export interface PlainTextOptions {
  /** Longest line, in characters. Default 72. */
  width?: number;
  /** Line break. Default CRLF. */
  eol?: string;
  /**
   * Charset of the result. Default `us-ascii`, which every client and gateway passes: accents are
   * dropped and other characters folded (see `asciiFold`). `iso-8859-1` keeps Western European
   * letters and folds the rest; `utf-8` keeps everything.
   */
  charset?: Charset;
}

export interface PlainTextResult {
  /** The text, ready to paste or to use as a message body. */
  text: string;
  /** The text encoded in the chosen charset. */
  bytes: Uint8Array;
  /** True when any character had to be changed to fit the charset. */
  folded: boolean;
}

/** Indent for a field value that does not fit on the label's line. */
const INDENT = '  ';

function fold(s: string, charset: Charset): string {
  const nfc = s.normalize('NFC');
  if (charset === 'utf-8') return nfc;
  if (charset === 'us-ascii') return asciiFold(nfc);
  let out = '';
  for (const ch of nfc) out += ch.codePointAt(0)! <= 0xff ? ch : asciiFold(ch);
  return out;
}

function lines(s: string): string[] {
  return s.split(/\r\n|\r|\n/).map((l) => l.replace(/[ \t]+$/, ''));
}

/**
 * Lay out a message as plain text. A field whose value fits after its label on one line is written
 * `Label: value`; a longer or multi-line value starts on the next line, indented two spaces. Trailing
 * spaces are trimmed and no line is longer than `width`. Throws a RangeError for a bad option and a
 * TypeError for a value that is not a string.
 */
export function writePlainText(msg: PlainTextMessage, opts?: PlainTextOptions): PlainTextResult {
  const width = opts?.width ?? 72;
  const eol = opts?.eol ?? '\r\n';
  const charset = opts?.charset ?? 'us-ascii';
  if (!Number.isInteger(width) || width < 10) throw new RangeError('writePlainText: width must be an integer of 10 or more');
  if (charset !== 'us-ascii' && charset !== 'iso-8859-1' && charset !== 'utf-8') {
    throw new RangeError(`writePlainText: unknown charset ${String(charset)}`);
  }
  if (typeof msg !== 'object' || msg === null) throw new TypeError('writePlainText: expected a message object');
  const str = (v: unknown, who: string): string => {
    if (typeof v !== 'string') throw new TypeError(`writePlainText: ${who} must be a string`);
    return v;
  };

  let folded = false;
  const f = (s: string): string => {
    const out = fold(s, charset);
    if (out !== s.normalize('NFC')) folded = true;
    return out;
  };
  const wrap = (s: string, w: number): string[] => wrapText(s, { width: w, eol: '\n' }).split('\n');

  const blocks: string[][] = [];
  if (msg.title !== undefined) blocks.push(wrap(f(str(msg.title, 'title')), width));
  if (msg.fields !== undefined) {
    if (!Array.isArray(msg.fields)) throw new TypeError('writePlainText: fields must be an array');
    const out: string[] = [];
    msg.fields.forEach((field: PlainTextField, i: number) => {
      const label = f(str(field?.label, `fields[${i}].label`)).replace(/\s+/g, ' ').trim();
      const value = lines(f(str(field?.value, `fields[${i}].value`)));
      while (value.length && value[value.length - 1] === '') value.pop();
      while (value.length && value[0] === '') value.shift();
      const one = `${label}: ${value[0] ?? ''}`.trimEnd();
      if (value.length <= 1 && one.length <= width) {
        out.push(one);
      } else {
        out.push(...wrap(`${label}:`, width));
        for (const l of value) out.push(...wrap(l, width - INDENT.length).map((x) => (x ? INDENT + x : '')));
      }
    });
    blocks.push(out);
  }
  if (msg.body !== undefined) blocks.push(wrap(lines(f(str(msg.body, 'body'))).join('\n'), width));

  const text = blocks
    .filter((b) => b.length && !(b.length === 1 && b[0] === ''))
    .map((b) => b.join(eol))
    .join(eol + eol);
  const bytes = charset === 'utf-8' ? encodeUtf8(text) : charset === 'iso-8859-1' ? encodeLatin1(text) : encodeAscii(text);
  return { text, bytes, folded };
}
