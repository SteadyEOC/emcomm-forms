// Pat's B2F message file (.b2f): CRLF headers, a blank line, `Body:` bytes of text,
// then each attachment preceded by CRLF and sized by its `File:` line, then a final CRLF.
// B2F is not MIME; the counts are bytes, and a wrong count misaligns everything after it.

import type { Sink } from './issue.js';
import { isValidMid } from '../mid/mid.js';
import { bareLfLines, decodeLatin1, decodeUtf8, describeLines, hasNonAscii, looksLikeUtf8 } from './text.js';

export interface B2fAttachment {
  name: string;
  bytes: Uint8Array;
}

export interface B2fParts {
  headers: { name: string; value: string; line: number }[];
  body: Uint8Array;
  attachments: B2fAttachment[];
}

const KNOWN = new Set(['mid', 'body', 'content-transfer-encoding', 'content-type', 'date', 'file', 'from', 'mbo', 'subject', 'to', 'cc', 'type']);
const CALL_OR_TACTICAL = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkAddress(header: string, value: string, line: number, sink: Sink) {
  const v = value.trim();
  if (/^SMTP:/i.test(v)) {
    if (!EMAIL.test(v.slice(5))) sink.add('b2f/address-smtp-format', header, `"${v}" is not SMTP:user@host`, { line });
  } else if (EMAIL.test(v)) {
    sink.add('b2f/address-no-smtp-prefix', header, `Internet address "${v}" has no SMTP: prefix`, {
      line,
      hint: /@winlink\.org$/i.test(v) ? 'Write the call sign alone for a Winlink address.' : 'Pat writes SMTP:user@host.',
    });
  } else if (!CALL_OR_TACTICAL.test(v)) {
    sink.add('b2f/address-unrecognised', header, `"${v}" is not a call sign, tactical address or SMTP:user@host`, { line });
  }
}

/** Parse and check a B2F file. Returns the parts when the layout is readable. */
export function checkB2f(bytes: Uint8Array, sink: Sink): B2fParts | undefined {
  // Header lines.
  const headers: B2fParts['headers'] = [];
  let pos = 0;
  let line = 0;
  let bare = false;
  let hdrEnd = -1;
  while (pos < bytes.length) {
    let lf = bytes.indexOf(10, pos);
    if (lf < 0) lf = bytes.length;
    line += 1;
    const hasCr = lf > pos && bytes[lf - 1] === 13;
    if (lf < bytes.length && !hasCr) bare = true;
    const raw = decodeLatin1(bytes.subarray(pos, hasCr ? lf - 1 : lf));
    pos = lf + 1;
    if (raw === '') { hdrEnd = pos; break; }
    const colon = raw.indexOf(':');
    if (colon <= 0) {
      sink.add('b2f/bad-header-line', '', `Header line has no "Name:": ${JSON.stringify(raw.slice(0, 40))}`, { line });
      continue;
    }
    if (/[-￿]/.test(raw)) {
      sink.add('b2f/raw-non-ascii-header', raw.slice(0, colon), `Header "${raw.slice(0, colon)}" holds raw non-ASCII bytes`, {
        line,
        hint: 'Pat encodes non-ASCII headers as RFC 2047 encoded words.',
      });
    }
    headers.push({ name: raw.slice(0, colon), value: raw.slice(colon + 1).replace(/^ /, ''), line });
  }
  if (hdrEnd < 0) {
    sink.add('b2f/no-header-end', '', 'No blank line after the headers');
    return undefined;
  }
  if (bare) sink.add('b2f/bare-lf-headers', '', 'Header lines end in bare LF', { hint: 'Pat writes CRLF.' });

  const all = (n: string) => headers.filter((h) => h.name.toLowerCase() === n);
  const first = (n: string) => all(n)[0];
  for (const h of headers) {
    const lower = h.name.toLowerCase();
    if (!KNOWN.has(lower) && !lower.startsWith('x-')) sink.add('b2f/unknown-header', h.name, `Unknown header "${h.name}"`, { line: h.line });
    if (['mid', 'body', 'date', 'from', 'subject', 'type', 'mbo', 'content-type'].includes(lower) && all(lower).length > 1 && all(lower)[0] !== h) {
      sink.add('b2f/duplicate-header', h.name, `"${h.name}" appears more than once`, { line: h.line });
    }
  }

  const mid = first('mid');
  if (!mid) sink.add('b2f/missing-header', 'Mid', 'No Mid header');
  else if (!isValidMid(mid.value.trim())) sink.add('b2f/invalid-mid', 'Mid', `Mid "${mid.value}" is not 1 to 12 characters`, { line: mid.line });
  else if (!/^[A-Z0-9]+$/.test(mid.value.trim())) sink.add('b2f/mid-characters', 'Mid', `Mid "${mid.value}" has characters other than A-Z and 0-9`, { line: mid.line });

  const date = first('date');
  if (!date) sink.add('b2f/missing-header', 'Date', 'No Date header');
  else if (!/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/.test(date.value.trim())) {
    sink.add('b2f/date-format', 'Date', `Date "${date.value}" is not "YYYY/MM/DD HH:MM" (UTC)`, { line: date.line });
  }
  const from = first('from');
  if (!from || from.value.trim() === '') sink.add('b2f/missing-header', 'From', 'No From header');
  const to = all('to');
  if (!to.length) sink.add('b2f/missing-header', 'To', 'No To header');
  for (const h of [...to, ...all('cc')]) checkAddress(h.name, h.value, h.line, sink);
  if (!first('subject')) sink.add('b2f/missing-recommended-header', 'Subject', 'No Subject header');
  if (!first('mbo')) sink.add('b2f/missing-recommended-header', 'Mbo', 'No Mbo header', { hint: 'Pat writes the mailbox owner call sign.' });
  const type = first('type');
  if (!type) sink.add('b2f/missing-recommended-header', 'Type', 'No Type header', { hint: 'Pat writes Type: Private.' });
  else if (!/^(Private|Service|Inquiry|Position Report|Option|System)$/.test(type.value.trim())) {
    sink.add('b2f/unusual-type', 'Type', `Unusual Type "${type.value}"`, { line: type.line });
  }

  const ct = first('content-type');
  const charset = ct ? /charset\s*=\s*"?([^";\s]+)/i.exec(ct.value)?.[1]?.toLowerCase() : undefined;
  if (ct && charset === undefined) sink.add('b2f/no-charset', 'Content-Type', 'Content-Type names no charset', { line: ct.line });

  // Sizes.
  const bodyHdr = first('body');
  if (!bodyHdr) {
    sink.add('b2f/missing-body-header', 'Body', 'No Body header: the body length is unknown');
    return undefined;
  }
  if (!/^\d+$/.test(bodyHdr.value.trim())) {
    sink.add('b2f/bad-count', 'Body', `Body "${bodyHdr.value}" is not a byte count`, { line: bodyHdr.line });
    return undefined;
  }
  const files: { name: string; size: number; line: number }[] = [];
  for (const f of all('file')) {
    const m = /^\s*(\d+) (.+)$/.exec(f.value);
    if (!m) {
      sink.add('b2f/bad-count', 'File', `File "${f.value}" is not "<bytes> <name>"`, { line: f.line });
      return undefined;
    }
    files.push({ name: m[2]!, size: Number(m[1]), line: f.line });
  }

  const bodyLen = Number(bodyHdr.value.trim());
  if (hdrEnd + bodyLen > bytes.length) {
    sink.add('b2f/truncated', 'Body', `Body says ${bodyLen} bytes but only ${bytes.length - hdrEnd} follow the headers`, {
      line: bodyHdr.line,
      hint: 'Count bytes in the body charset, not characters ("é" is 1 byte in ISO-8859-1, 2 in UTF-8).',
    });
    return undefined;
  }
  const body = bytes.subarray(hdrEnd, hdrEnd + bodyLen);
  pos = hdrEnd + bodyLen;
  const attachments: B2fAttachment[] = [];
  for (const f of files) {
    if (bytes[pos] !== 13 || bytes[pos + 1] !== 10) {
      sink.add('b2f/missing-crlf', 'File', `Expected CRLF before attachment "${f.name}" at byte ${pos}`, {
        line: f.line,
        hint: 'The Body: count (or an earlier File: count) is wrong, so this part starts in the wrong place. Counts are bytes.',
      });
      return undefined;
    }
    pos += 2;
    if (pos + f.size > bytes.length) {
      sink.add('b2f/truncated', 'File', `Attachment "${f.name}" says ${f.size} bytes but only ${bytes.length - pos} remain`, { line: f.line });
      return undefined;
    }
    attachments.push({ name: f.name, bytes: bytes.subarray(pos, pos + f.size) });
    pos += f.size;
  }
  const rest = bytes.length - pos;
  const crlf = rest === 2 && bytes[pos] === 13 && bytes[pos + 1] === 10;
  if (files.length === 0 ? rest === 0 : crlf) {
    // Pat's shape: no attachments, the body's own CRLF ends the file; with attachments, one CRLF after the last.
  } else if (rest === 0) {
    sink.add('b2f/no-final-crlf', '', 'No CRLF after the last part', { hint: 'Pat ends the file with CRLF.' });
  } else {
    sink.add(rest > 2 ? 'b2f/extra-bytes' : 'b2f/trailing-bytes', '', `${rest} bytes after the last part`, {
      hint: rest > 2 ? 'A Body: or File: count is too small, or a File: line is missing.' : files.length === 0 ? 'Pat ends a message with no attachments right after the body.' : 'Pat ends the file with exactly CRLF.',
    });
  }

  // Body text.
  if (charset === 'utf-8' || charset === 'utf8') {
    const r = decodeUtf8(body);
    if (r.badAt >= 0) sink.add('b2f/invalid-utf8', 'Body', `Body is labelled UTF-8 but is not (bad byte at body offset ${r.badAt})`);
  } else if (charset === 'iso-8859-1' || charset === 'latin1') {
    if (looksLikeUtf8(body)) {
      sink.add('b2f/charset-mismatch', 'Body', 'Body is labelled ISO-8859-1 but looks like UTF-8', {
        hint: 'Accented letters will show as two odd characters. Encode as ISO-8859-1, or label it UTF-8.',
      });
    }
  } else if (charset === 'us-ascii' || charset === undefined) {
    if (hasNonAscii(body)) sink.add('b2f/undeclared-non-ascii', 'Body', 'Body holds non-ASCII bytes but no charset says how to read them');
  } else {
    sink.add('b2f/unusual-charset', 'Content-Type', `Unusual charset "${charset}"`, { line: ct?.line });
  }
  const bareBody = bareLfLines(decodeLatin1(body));
  if (bareBody.length) sink.add('b2f/bare-lf-body', 'Body', `Bare LF in the body on body line ${describeLines(bareBody)}`, { hint: 'Pat writes CRLF.' });

  return { headers, body, attachments };
}
