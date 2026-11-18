// Winlink Express "Message > Export" file: XML wrapping each message's raw MIME text.

import { isValidMid } from '../mid/mid.js';
import { decodeQuotedPrintable } from '../encoding/quoted-printable.js';
import type { Sink } from './issue.js';
import { decodeBase64 } from './text.js';
import { childrenNamed, decodeXmlBytes, parseXml, type XmlElement } from './xml-parse.js';

export interface MimeAttachment {
  name: string;
  bytes: Uint8Array;
}

interface Header {
  name: string;
  value: string;
}

function parseHeaders(block: string): Header[] {
  const out: Header[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && out.length) out[out.length - 1]!.value += ' ' + line.trim();
    else {
      const c = line.indexOf(':');
      if (c > 0) out.push({ name: line.slice(0, c).trim(), value: line.slice(c + 1).trim() });
    }
  }
  return out;
}

function header(hs: Header[], name: string): string | undefined {
  return hs.find((h) => h.name.toLowerCase() === name)?.value;
}

function param(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  const m = new RegExp(`(?:^|;)\\s*${name}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, 'i').exec(value);
  return m ? (m[1] ?? m[2]) : undefined;
}

function splitHeadBody(text: string): [string, string] | undefined {
  const m = /\r?\n\r?\n/.exec(text);
  return m ? [text.slice(0, m.index), text.slice(m.index + m[0].length)] : undefined;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Check one message's MIME text; returns its decoded attachments. */
export function checkMime(mime: string, sink: Sink, path: string, id?: string): MimeAttachment[] {
  const hb = splitHeadBody(mime);
  if (!hb) {
    sink.add('mime/no-header-end', path, 'MIME text has no blank line after its headers');
    return [];
  }
  const hs = parseHeaders(hb[0]);
  for (const name of ['from', 'date', 'content-type']) {
    if (header(hs, name) === undefined) sink.add('mime/header-missing', `${path}/${name}`, `MIME header ${name} is missing`);
  }
  if (header(hs, 'to') === undefined && header(hs, 'cc') === undefined) sink.add('mime/no-recipient', `${path}/to`, 'No To or Cc header');
  for (const name of ['subject', 'message-id', 'mime-version']) {
    if (header(hs, name) === undefined) sink.add('mime/header-recommended', `${path}/${name}`, `MIME header ${name} is missing`);
  }
  const msgId = header(hs, 'message-id');
  if (id !== undefined && msgId !== undefined && msgId.replace(/^<|>$/g, '') !== id) {
    sink.add('mime/message-id-mismatch', `${path}/message-id`, `Message-ID "${msgId}" differs from <id> "${id}"`);
  }
  const ct = header(hs, 'content-type') ?? 'text/plain';
  if (!/^multipart\//i.test(ct)) return [];

  const boundary = param(ct, 'boundary');
  if (!boundary) {
    sink.add('mime/no-boundary', `${path}/content-type`, 'multipart Content-Type has no boundary');
    return [];
  }
  const segs = hb[1].split(new RegExp(`(?:^|\\r?\\n)--${escapeRe(boundary)}`));
  const out: MimeAttachment[] = [];
  let closed = false;
  segs.slice(1).forEach((seg, k) => {
    if (closed) return;
    if (seg.startsWith('--')) { closed = true; return; }
    const part = seg.replace(/^[ \t]*\r?\n/, '');
    const phb = splitHeadBody(part);
    const ppath = `${path}/part ${k + 1}`;
    if (!phb) {
      sink.add('mime/part-no-header-end', ppath, 'MIME part has no blank line after its headers');
      return;
    }
    const ph = parseHeaders(phb[0]);
    const cte = (header(ph, 'content-transfer-encoding') ?? '7bit').toLowerCase();
    const name = param(header(ph, 'content-disposition'), 'filename') ?? param(header(ph, 'content-type'), 'name');
    let bytes: Uint8Array | undefined;
    if (cte === 'base64') {
      bytes = decodeBase64(phb[1]) ?? undefined;
      if (!bytes) sink.add('mime/bad-base64', ppath, `Part${name ? ` "${name}"` : ''} is not valid base64`);
    } else if (cte === 'quoted-printable') {
      const long = phb[1].split(/\r?\n/).findIndex((l) => l.length > 76);
      if (long >= 0) sink.add('mime/qp-line-length', ppath, `Quoted-printable line ${long + 1} is longer than 76 characters`);
      try {
        bytes = decodeQuotedPrintable(phb[1]);
      } catch (e) {
        sink.add('mime/bad-quoted-printable', ppath, `Part is not valid quoted-printable: ${(e as Error).message}`);
      }
    } else if (!['7bit', '8bit', 'binary'].includes(cte)) {
      sink.add('mime/unknown-transfer-encoding', ppath, `Unknown Content-Transfer-Encoding "${cte}"`);
    }
    if (name !== undefined && bytes) out.push({ name, bytes });
  });
  if (!closed) {
    sink.add('mime/no-closing-boundary', path, `No closing boundary --${boundary}--`, { hint: 'The message is cut short, or the boundary is wrong.' });
  }
  return out;
}

export interface ExportMessage {
  id: string | undefined;
  attachments: MimeAttachment[];
}

export function checkWinlinkExport(bytes: Uint8Array, sink: Sink): ExportMessage[] {
  const text = decodeXmlBytes(bytes, sink, '', { lenientEncoding: true });
  const doc = parseXml(text, sink, '');
  const root = doc.root;
  if (!doc.wellFormed || !root) return [];
  if (root.name !== 'Winlink_Express_message_export') {
    sink.add('export/wrong-root', root.name, `Root element is <${root.name}>, not <Winlink_Express_message_export>`, { line: root.line });
    return [];
  }
  const params = childrenNamed(root, 'export_parameters')[0];
  if (!params) sink.add('export/no-parameters', 'export_parameters', 'No <export_parameters>', { line: root.line });
  else {
    const xv = childrenNamed(params, 'xml_file_version')[0]?.text.trim();
    if (xv !== '1.0') sink.add('export/xml-version', 'export_parameters/xml_file_version', `xml_file_version is ${xv === undefined ? 'missing' : `"${xv}"`}; only 1.0 has been seen`, { line: params.line });
  }
  const list = childrenNamed(root, 'message_list')[0];
  if (!list) {
    sink.add('export/no-message-list', 'message_list', 'No <message_list>', { line: root.line });
    return [];
  }
  const messages = childrenNamed(list, 'message');
  if (!messages.length) sink.add('export/empty', 'message_list', 'The export holds no messages', { line: list.line });
  return messages.map((m, k) => checkMessage(m, k, sink));
}

function checkMessage(m: XmlElement, k: number, sink: Sink): ExportMessage {
  const path = `message ${k + 1}`;
  const id = childrenNamed(m, 'id')[0]?.text.trim();
  if (id === undefined || id === '') sink.add('export/missing-id', `${path}/id`, 'Message has no <id>', { line: m.line });
  else if (!isValidMid(id)) sink.add('export/invalid-id', `${path}/id`, `<id> "${id}" is not a 1 to 12 character message ID`, { line: m.line });
  const mime = childrenNamed(m, 'mime')[0];
  if (!mime) {
    sink.add('export/missing-mime', `${path}/mime`, 'Message has no <mime>', { line: m.line });
    return { id, attachments: [] };
  }
  return { id, attachments: checkMime(mime.text, sink, `${path}/mime`, id) };
}
