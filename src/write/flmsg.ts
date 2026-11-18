// FLMSG data files (for sending with FLDIGI) and the [WRAP] envelope.
//
// Layout learned by reading the FLMSG 4.0.20 source (GPL; read only, nothing copied), then checked
// against ICS-213 files saved by FLMSG 4.0.24 on Windows (2026-11-18; golden tests in
// test/samples/flmsg/; ICS-309 too). Still to check with real saves: plaintext, CSV form and the [WRAP]
// export (rule 3).
//
// Layout: `<flmsg>VERSION`, optional `:hdr_fm:` / `:hdr_ed:` header fields, the form tag line, then one
// `:tag:LENGTH VALUE` line per non-empty field, LENGTH in UTF-8 bytes, no escaping. FLMSG on Windows
// saves CRLF line ends but counts each line break in a value as one byte (LF), and so does this writer.

import { encodeUtf8 } from '../encoding/bytes.js';

/** FLMSG forms this writer knows, by FLMSG's form tag. */
export type FlmsgForm = 'ics213' | 'ics309' | 'plaintext' | 'csvform';

interface FlmsgFormSpec {
  ext: string;
  fields: readonly string[];
  rows?: { tags: readonly string[]; max: number };
}

/**
 * Field tags per form, in the order FLMSG writes them. ICS-213 (checked against real 4.0.24 saves): inc
 * incident, to, p1 its position, fm from, p2 its position, d1/t1 date/time, sb subject, s1 approved by,
 * p3 position, s2/p4 replier name/position, d2/t2 reply date/time, mg message, rp reply. ICS-309: inc, dfm/tfm and dto/tto
 * period from/to, pre prepared by, dtm date/time prepared, net, opr operator; rows tm time, to, fm,
 * msg subject. Plaintext: tt title, to, fm, sb subject, dt date, tm time, mg message. CSV form: mg.
 */
export const FLMSG_FORMS: Readonly<Record<FlmsgForm, FlmsgFormSpec>> = {
  ics213: { ext: '.213', fields: ['inc', 'to', 'p1', 'fm', 'p2', 'd1', 't1', 'sb', 's1', 'p3', 's2', 'p4', 'd2', 't2', 'mg', 'rp'] },
  ics309: {
    ext: '.309',
    fields: ['inc', 'dfm', 'tfm', 'dto', 'tto', 'pre', 'dtm', 'net', 'opr'],
    rows: { tags: ['tm', 'to', 'fm', 'msg'], max: 34 },
  },
  plaintext: { ext: '.p2s', fields: ['tt', 'to', 'fm', 'sb', 'dt', 'tm', 'mg'] },
  csvform: { ext: '.c2s', fields: ['mg'] },
};

/** A station line in an FLMSG header: call sign and the time it sent or edited the message. */
export interface FlmsgStation {
  call: string;
  date: Date;
}

export interface FlmsgFile {
  form: FlmsgForm;
  /** Field values by tag (see {@link FLMSG_FORMS}). Empty values are left out, as FLMSG does. */
  fields: Readonly<Record<string, string>>;
  /** ICS-309 log rows, by row tag (`tm`, `to`, `fm`, `msg`); at most 34. */
  rows?: readonly Readonly<Record<string, string>>[];
  /** `:hdr_fm:`: the station that sent it. */
  sentBy?: FlmsgStation;
  /** `:hdr_ed:`: stations that edited it, in order. */
  editedBy?: readonly FlmsgStation[];
  /** Version written on the first line. Default `4.0.24` (the release the golden samples came from). */
  version?: string;
  /**
   * Line ends between lines: `'crlf'` (default, as FLMSG saves on Windows) or `'lf'` (as on Linux and
   * macOS). Field lengths always count a line break inside a value as one byte, whichever is chosen.
   */
  lineEnd?: 'crlf' | 'lf';
}

const CALL_RE = /^[A-Za-z0-9/-]{1,20}$/;
const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

/** FLMSG header time: `YYYYDDMMhhmmss` in UTC (year, day, month). */
export function formatFlmsgHeaderDate(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) throw new RangeError('formatFlmsgHeaderDate: invalid date');
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCDate())}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

function headerValue(stations: readonly FlmsgStation[], who: string): string {
  let out = '';
  const seen = new Set<string>();
  for (const s of [...stations].reverse()) {
    if (typeof s?.call !== 'string' || !CALL_RE.test(s.call)) throw new RangeError(`writeFlmsg: ${who} call sign "${String(s?.call)}" is not valid`);
    const call = s.call.toUpperCase();
    if (seen.has(call)) continue; // FLMSG keeps one line per station, the latest
    seen.add(call);
    out = `\n${call} ${formatFlmsgHeaderDate(s.date)}` + out;
  }
  return out;
}

function line(tag: string, value: string): string {
  return `:${tag}:${encodeUtf8(value).length} ${value}\n`;
}

/** The file name extension FLMSG uses for a form's data file, e.g. `.213`. */
export function flmsgExtension(form: FlmsgForm): string {
  const spec = FLMSG_FORMS[form];
  if (!spec) throw new RangeError(`flmsgExtension: unknown form "${String(form)}"`);
  return spec.ext;
}

/**
 * Write an FLMSG data file (`.213`, `.309`, `.p2s`, `.c2s`). Returns the text with CRLF line ends
 * (or LF with `lineEnd: 'lf'`); save it as UTF-8.
 *
 * Throws a RangeError for an unknown form or tag, more than 34 ICS-309 rows (use `csvform` for a
 * longer log), a non-string value, a bad call sign, or a value that contains the text of a tag
 * written after it (FLMSG finds each field by searching for its tag, so it would read the wrong place).
 *
 * ICS-213 and ICS-309 are golden-tested against real FLMSG saves; the other forms are not yet (see the note at the
 * top of this file).
 */
export function writeFlmsg(file: FlmsgFile): string {
  const spec = FLMSG_FORMS[file?.form];
  if (!spec) throw new RangeError(`writeFlmsg: unknown form "${String(file?.form)}"; known: ${Object.keys(FLMSG_FORMS).join(', ')}`);
  const fields = file.fields ?? {};
  for (const tag of Object.keys(fields)) {
    if (!spec.fields.includes(tag)) throw new RangeError(`writeFlmsg: "${tag}" is not a ${file.form} field; known: ${spec.fields.join(' ')}`);
  }
  const rows = file.rows ?? [];
  if (rows.length && !spec.rows) throw new RangeError(`writeFlmsg: ${file.form} has no rows`);
  if (spec.rows && rows.length > spec.rows.max) {
    throw new RangeError(`writeFlmsg: ${file.form} holds at most ${spec.rows.max} rows (got ${rows.length}); send a longer log as csvform`);
  }

  const parts: [string, string][] = []; // [tag, value] in file order
  const val = (v: unknown, tag: string): string => {
    if (typeof v !== 'string') throw new TypeError(`writeFlmsg: "${tag}" must be a string`);
    return v.replace(/\r\n|\r/g, '\n');
  };
  if (file.sentBy) parts.push(['hdr_fm', headerValue([file.sentBy], 'sentBy')]);
  if (file.editedBy?.length) parts.push(['hdr_ed', headerValue(file.editedBy, 'editedBy')]);
  const headerCount = parts.length;
  for (const tag of spec.fields) {
    if (!Object.prototype.hasOwnProperty.call(fields, tag)) continue;
    const v = val(fields[tag], tag);
    if (v !== '') parts.push([tag, v]);
  }
  rows.forEach((row, i) => {
    for (const key of Object.keys(row)) {
      if (!spec.rows!.tags.includes(key)) throw new RangeError(`writeFlmsg: row ${i}: "${key}" is not a row field; known: ${spec.rows!.tags.join(' ')}`);
    }
    for (const t of spec.rows!.tags) {
      if (!Object.prototype.hasOwnProperty.call(row, t)) continue;
      const v = val(row[t], `${t}[${i}]`);
      if (v !== '') parts.push([`${t}[${i}]`, v]);
    }
  });

  // FLMSG reads a field at the first place its tag text appears in the file.
  for (let j = 0; j < parts.length; j++) {
    const needle = `:${parts[j]![0]}:`;
    for (let i = 0; i < j; i++) {
      if (parts[i]![1].includes(needle)) {
        throw new RangeError(`writeFlmsg: "${parts[i]![0]}" contains "${needle}", so FLMSG would read "${parts[j]![0]}" from the wrong place`);
      }
    }
  }

  const version = file.version ?? '4.0.24';
  const lineEnd = file.lineEnd ?? 'crlf';
  if (lineEnd !== 'crlf' && lineEnd !== 'lf') throw new RangeError(`writeFlmsg: lineEnd must be 'crlf' or 'lf'`);
  if (!/^[0-9][0-9A-Za-z.-]*$/.test(version)) throw new RangeError('writeFlmsg: version must look like 4.0.20');
  let out = `<flmsg>${version}\n`;
  parts.slice(0, headerCount).forEach(([t, v]) => (out += line(t, v)));
  out += `<${file.form}>\n`;
  parts.slice(headerCount).forEach(([t, v]) => (out += line(t, v)));
  return lineEnd === 'crlf' ? out.replace(/\n/g, '\r\n') : out;
}

/** CRC-16/MODBUS (reflected poly 0xA001, init 0xFFFF, no final XOR) of some bytes. */
export function crc16Modbus(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc;
}

/**
 * Put an FLMSG file in FLMSG's `[WRAP]` envelope, as sent over the air or saved as a `.wrap` file:
 * `[WRAP:beg][WRAP:lf][WRAP:fn NAME]TEXT[WRAP:chksum XXXX][WRAP:end]`. Line ends in the text become LF.
 * The checksum is CRC-16/MODBUS over `[WRAP:fn NAME]` plus the text, as UTF-8 bytes.
 *
 * **Untested against a real FLMSG wrap**; see the note at the top of this file.
 */
export function wrapFlmsg(fileName: string, text: string): string {
  if (typeof fileName !== 'string' || !/^[^\s[\]/\\]+$/.test(fileName)) throw new RangeError('wrapFlmsg: file name must have no spaces, brackets or slashes');
  if (typeof text !== 'string') throw new TypeError('wrapFlmsg: text must be a string');
  const body = `[WRAP:fn ${fileName}]${text.replace(/\r\n|\r/g, '\n')}`;
  const sum = crc16Modbus(encodeUtf8(body)).toString(16).toUpperCase().padStart(4, '0');
  return `[WRAP:beg][WRAP:lf]${body}[WRAP:chksum ${sum}][WRAP:end]`;
}
