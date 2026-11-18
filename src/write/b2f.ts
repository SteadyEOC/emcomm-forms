import { encodeLatin1 } from '../encoding/bytes.js';
import { formatB2fDate } from '../date/format.js';
import { generateMid, isValidMid } from '../mid/mid.js';
import { normaliseLineEndings } from '../text/layout.js';

/** A file attached to a B2F message. The bytes are written exactly as given (nothing is converted). */
export interface B2fAttachment {
  /** File name, without a path. */
  name: string;
  bytes: Uint8Array;
}

/** Input for {@link writeB2f}. */
export interface B2fMessage {
  /** Message ID, 1 to 12 characters. Omit it to have one made with `randomBytes`. */
  mid?: string;
  /** Source of random bytes (such as a wrapper around crypto.getRandomValues). Needed only when `mid` is omitted. */
  randomBytes?: (n: number) => Uint8Array;
  /** A Date (written in UTC as `YYYY/MM/DD HH:MM`), or that text already formatted. */
  date: Date | string;
  /** The sender, which may be a tactical address. */
  from: string;
  /** The mailbox call sign (the Mbo header). */
  mbo: string;
  /** Recipients, in order. Internet addresses (containing "@") get the `SMTP:` prefix. */
  to: readonly string[];
  cc?: readonly string[];
  subject: string;
  /** Body text. Any line endings are normalised to CRLF. Characters outside ISO-8859-1 throw a RangeError. */
  body: string;
  attachments?: readonly B2fAttachment[];
  /** Adds `X-P2ponly: true`. */
  p2pOnly?: boolean;
}

const DATE_RE = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/;

function oneLine(s: unknown, who: string): string {
  if (typeof s !== 'string') throw new TypeError(`writeB2f: ${who} must be a string`);
  if (/[\r\n]/.test(s)) throw new RangeError(`writeB2f: ${who} must not contain a line break`);
  return s;
}

function address(a: string, who: string): string {
  const v = oneLine(a, who).trim();
  if (v === '') throw new RangeError(`writeB2f: ${who} is empty`);
  if (/^smtp:/i.test(v)) return 'SMTP:' + v.slice(5);
  return v.includes('@') ? 'SMTP:' + v : v;
}

const HEX = '0123456789ABCDEF';
const MAX_WORD = 75; // RFC 2047 limit for one encoded word

/** Latin-1 subject: plain if printable ASCII, else RFC 2047 "q" words (lowercase q, as Pat writes them). */
function encodeSubject(s: string): string {
  const v = oneLine(s, 'subject');
  if (!/[^\t\x20-\x7e]/.test(v)) return v;
  const bytes = encodeLatin1(v); // throws RangeError for characters Latin-1 cannot hold
  const prefix = '=?ISO-8859-1?q?';
  const room = MAX_WORD - prefix.length - 2; // minus the closing "?="
  const words: string[] = [];
  let cur = '';
  for (const b of bytes) {
    let t: string;
    if (b === 0x20) t = '_';
    else if (b >= 0x21 && b <= 0x7e && b !== 0x3d && b !== 0x3f && b !== 0x5f) t = String.fromCharCode(b);
    else t = '=' + HEX[b >> 4] + HEX[b & 15];
    if (cur.length + t.length > room) {
      words.push(cur);
      cur = '';
    }
    cur += t;
  }
  words.push(cur);
  return words.map((w) => `${prefix}${w}?=`).join(' ');
}

function cat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/**
 * Write a plain (text) Winlink B2F message as bytes, in the layout Pat 1.0.1 writes: headers
 * (Mid, Body, then alphabetical) with CRLF, a blank line, the Latin-1 body, and for each
 * attachment a CRLF and its raw bytes, then a final CRLF. With no attachments there is no
 * trailing CRLF after the body. Text outside Latin-1 throws RangeError (nothing is folded
 * or replaced silently); line breaks in header values throw too.
 */
export function writeB2f(msg: B2fMessage): Uint8Array {
  const mid = msg.mid ?? generateMid(
    msg.randomBytes ?? ((): Uint8Array => { throw new TypeError('writeB2f: give either mid or randomBytes'); }),
  );
  if (!isValidMid(mid) || /\s/.test(mid)) throw new RangeError(`writeB2f: invalid mid "${mid}"`);
  const date = typeof msg.date === 'string' ? msg.date : formatB2fDate(msg.date);
  if (!DATE_RE.test(date)) throw new RangeError('writeB2f: date must be YYYY/MM/DD HH:MM');
  if (!msg.to || msg.to.length === 0) throw new RangeError('writeB2f: at least one recipient is required');
  const from = oneLine(msg.from, 'from');
  const mbo = oneLine(msg.mbo, 'mbo');
  if (typeof msg.body !== 'string') throw new TypeError('writeB2f: body must be a string');
  const body = encodeLatin1(normaliseLineEndings(msg.body));
  const files = msg.attachments ?? [];

  const lines: string[] = [`Mid: ${mid}`, `Body: ${body.length}`];
  for (const c of msg.cc ?? []) lines.push(`Cc: ${address(c, 'cc')}`);
  lines.push('Content-Transfer-Encoding: 8bit', 'Content-Type: text/plain; charset=ISO-8859-1', `Date: ${date}`);
  for (const f of files) {
    if (!(f.bytes instanceof Uint8Array)) throw new TypeError('writeB2f: attachment bytes must be a Uint8Array');
    const name = oneLine(f.name, 'attachment name');
    if (name === '') throw new RangeError('writeB2f: attachment name is empty');
    lines.push(`File: ${f.bytes.length} ${name}`);
  }
  lines.push(`From: ${from}`, `Mbo: ${mbo}`, `Subject: ${encodeSubject(msg.subject)}`);
  for (const t of msg.to) lines.push(`To: ${address(t, 'to')}`);
  lines.push('Type: Private');
  if (msg.p2pOnly) lines.push('X-P2ponly: true');

  const crlf = new Uint8Array([13, 10]);
  const parts: Uint8Array[] = [encodeLatin1(lines.join('\r\n') + '\r\n\r\n'), body];
  for (const f of files) parts.push(crlf, f.bytes);
  if (files.length > 0) parts.push(crlf);
  return cat(parts);
}
