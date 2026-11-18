// A small strict XML 1.0 parser, enough for the files emcomm clients write: elements,
// attributes, text, the five predefined entities, character references, CDATA, comments
// and processing instructions. No DTDs (an internal subset is refused), no namespaces.
// It stops at the first well-formedness error and reports it with a line number.
// Text is kept as written (CRLF is not normalised), so callers can check line ends.

import { isXmlChar } from '../xml/escape.js';
import type { Sink } from './issue.js';
import { decodeLatin1, decodeUtf8, lineIndex } from './text.js';

export interface XmlElement {
  name: string;
  attrs: Map<string, string>;
  children: XmlElement[];
  /** Direct text content with entities decoded, including whitespace between children. */
  text: string;
  line: number;
}

export interface XmlDocument {
  /** Pseudo-attributes of `<?xml ...?>`, or undefined when there is no declaration. */
  declaration: Map<string, string> | undefined;
  root: XmlElement | undefined;
  wellFormed: boolean;
}

class Fatal extends Error {}

const NAME = /[\p{L}_:][\p{L}\p{N}._:\-·]*/uy;
const PREDEFINED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const LATIN1 = new Set(['iso-8859-1', 'latin1', 'iso_8859-1', 'l1']);

export interface DecodeXmlOptions {
  /** Report bytes that aren't valid UTF-8 (with no encoding declared) as a warning, not an error. */
  lenientEncoding?: boolean;
}

/** Decode XML bytes using the encoding the declaration names (UTF-8 when none). */
export function decodeXmlBytes(bytes: Uint8Array, sink: Sink, path: string, opts: DecodeXmlOptions = {}): string {
  let body = bytes;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) body = bytes.subarray(3);
  const head = decodeLatin1(body.subarray(0, 200));
  const enc = /^<\?xml[^>]*?encoding\s*=\s*["']([^"']+)["']/.exec(head)?.[1]?.toLowerCase();
  if (enc !== undefined && LATIN1.has(enc)) return decodeLatin1(body);
  if (enc !== undefined && enc !== 'utf-8' && enc !== 'utf8' && enc !== 'us-ascii') {
    sink.add('xml/encoding-declared', path, `Declares encoding "${enc}"; read as UTF-8`, {
      hint: 'WE and Pat write UTF-8 (Pat declares it; WE declares nothing).',
    });
  }
  const r = decodeUtf8(body);
  if (r.badAt >= 0) {
    sink.add(opts.lenientEncoding && enc === undefined ? 'xml/invalid-utf8-lenient' : 'xml/invalid-utf8', path, `Not valid UTF-8 (first bad byte at offset ${r.badAt})`, {
      hint: 'An XML file with no encoding declared must be UTF-8. Write UTF-8, or declare encoding="ISO-8859-1".',
    });
  }
  return r.text;
}

/** Parse XML text. Well-formedness errors go to the sink (as errors) and stop the parse. */
export function parseXml(text: string, sink: Sink, path: string): XmlDocument {
  const lineOf = lineIndex(text);
  const n = text.length;
  let i = 0;
  let declaration: Map<string, string> | undefined;
  let root: XmlElement | undefined;
  const stack: XmlElement[] = [];

  const fail = (at: number, message: string, hint?: string, rule = 'xml/not-well-formed'): never => {
    sink.add(rule, path, message, { line: lineOf(at), hint });
    throw new Fatal();
  };

  const checkChars = (start: number, end: number) => {
    for (let k = start; k < end; k++) {
      const cp = text.codePointAt(k)!;
      if (cp > 0xffff) k += 1;
      if (!isXmlChar(cp)) {
        fail(k, `Character U+${cp.toString(16).toUpperCase().padStart(4, '0')} is not allowed in XML`,
          'Remove control characters (other than tab, CR, LF) before writing.');
      }
    }
  };

  const decodeEntities = (start: number, end: number): string => {
    let out = '';
    let k = start;
    while (k < end) {
      const amp = text.indexOf('&', k);
      if (amp < 0 || amp >= end) {
        out += text.slice(k, end);
        break;
      }
      out += text.slice(k, amp);
      const m = /&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z_][\w.-]*);/y;
      m.lastIndex = amp;
      const hit = m.exec(text);
      if (!hit || amp + hit[0].length > end) {
        fail(amp, "'&' is not escaped", "Write a literal & as &amp; (e.g. 'R&R' becomes 'R&amp;R').", 'xml/unescaped-amp');
      }
      const ref = hit![1]!;
      if (ref.startsWith('#')) {
        const cp = ref[1] === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
        if (!isXmlChar(cp)) fail(amp, `Character reference &${ref}; is not an allowed XML character`);
        out += String.fromCodePoint(cp);
      } else {
        const v = PREDEFINED[ref];
        if (v === undefined) {
          fail(amp, `Unknown entity &${ref};`, "XML has only &lt; &gt; &amp; &quot; &apos;. Escape a literal & as &amp;.");
        }
        out += v;
      }
      k = amp + hit![0].length;
    }
    return out;
  };

  const handleText = (start: number, end: number) => {
    checkChars(start, end);
    const top = stack[stack.length - 1];
    if (!top) {
      if (/\S/.test(text.slice(start, end))) fail(start + text.slice(start, end).search(/\S/), 'Text outside the root element');
      return;
    }
    const gt = text.indexOf(']]>', start);
    if (gt >= 0 && gt < end) fail(gt, "']]>' must not appear in text", 'Escape it as ]]&gt;.');
    top.text += decodeEntities(start, end);
  };

  const readName = (at: number, what: string): string => {
    NAME.lastIndex = at;
    const m = NAME.exec(text);
    if (!m) fail(at, `Expected ${what}`);
    return m![0];
  };

  const skipWs = () => {
    const start = i;
    while (i < n && /[ \t\r\n]/.test(text[i]!)) i++;
    return i > start;
  };

  try {
    if (text.charCodeAt(0) === 0xfeff) i = 1;
    if (text.startsWith('<?xml', i) && /[ \t\r\n?]/.test(text[i + 5] ?? '')) {
      const end = text.indexOf('?>', i);
      if (end < 0) fail(i, 'The XML declaration is not closed');
      declaration = new Map();
      for (const m of text.slice(i + 5, end).matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)) declaration.set(m[1]!, m[3]!);
      if (!declaration.has('version')) fail(i, 'The XML declaration has no version');
      i = end + 2;
    }

    while (i < n) {
      const lt = text.indexOf('<', i);
      const textEnd = lt < 0 ? n : lt;
      if (textEnd > i) handleText(i, textEnd);
      if (lt < 0) break;
      i = lt;

      if (text.startsWith('<!--', i)) {
        const e = text.indexOf('-->', i + 4);
        if (e < 0) fail(i, 'Comment is not closed');
        if (text.slice(i + 4, e).includes('--')) fail(i, "'--' inside a comment");
        i = e + 3;
        continue;
      }
      if (text.startsWith('<![CDATA[', i)) {
        const top = stack[stack.length - 1];
        if (!top) fail(i, 'CDATA outside the root element');
        const e = text.indexOf(']]>', i + 9);
        if (e < 0) fail(i, 'CDATA section is not closed');
        checkChars(i + 9, e);
        top!.text += text.slice(i + 9, e);
        i = e + 3;
        continue;
      }
      if (text.startsWith('<!DOCTYPE', i)) {
        if (root) fail(i, 'DOCTYPE after the root element');
        const e = text.indexOf('>', i);
        if (e < 0) fail(i, 'DOCTYPE is not closed');
        if (text.slice(i, e).includes('[')) fail(i, 'A DOCTYPE with an internal subset is not supported', 'These files never need one.');
        sink.add('xml/doctype', path, 'Unexpected DOCTYPE', { line: lineOf(i) });
        i = e + 1;
        continue;
      }
      if (text.startsWith('<?', i)) {
        const e = text.indexOf('?>', i);
        if (e < 0) fail(i, 'Processing instruction is not closed');
        const target = /^<\?([^\s?]+)/.exec(text.slice(i, e + 2))?.[1] ?? '';
        if (target.toLowerCase() === 'xml') fail(i, 'The XML declaration must be the very first thing in the file');
        i = e + 2;
        continue;
      }
      if (text.startsWith('</', i)) {
        const at = i;
        const name = readName(i + 2, 'an element name after </');
        i += 2 + name.length;
        skipWs();
        if (text[i] !== '>') fail(i, `Expected '>' to close </${name}`);
        i += 1;
        const top = stack.pop();
        if (!top) fail(at, `</${name}> closes nothing`);
        if (top!.name !== name) fail(at, `</${name}> does not match <${top!.name}> (line ${top!.line})`);
        continue;
      }

      // Start tag.
      const at = i;
      const name = readName(i + 1, "an element name after '<'");
      i += 1 + name.length;
      const attrs = new Map<string, string>();
      let selfClosing = false;
      for (;;) {
        const hadWs = skipWs();
        if (text.startsWith('/>', i)) { selfClosing = true; i += 2; break; }
        if (text[i] === '>') { i += 1; break; }
        if (i >= n) fail(at, `<${name}> is not closed`);
        if (!hadWs) fail(i, `Expected whitespace, '>' or '/>' in <${name}>`);
        const attr = readName(i, `an attribute name in <${name}>`);
        i += attr.length;
        skipWs();
        if (text[i] !== '=') fail(i, `Attribute ${attr} in <${name}> has no value`);
        i += 1;
        skipWs();
        const q = text[i];
        if (q !== '"' && q !== "'") fail(i, `Attribute ${attr} in <${name}> must be quoted`);
        const close = text.indexOf(q!, i + 1);
        if (close < 0) fail(i, `Attribute ${attr} in <${name}> is not closed`);
        const lt2 = text.indexOf('<', i + 1);
        if (lt2 >= 0 && lt2 < close) fail(lt2, `'<' in the value of attribute ${attr}`, 'Escape it as &lt;.');
        checkChars(i + 1, close);
        if (attrs.has(attr)) fail(i, `Attribute ${attr} appears twice in <${name}>`);
        attrs.set(attr, decodeEntities(i + 1, close));
        i = close + 1;
      }
      const el: XmlElement = { name, attrs, children: [], text: '', line: lineOf(at) };
      const parent = stack[stack.length - 1];
      if (parent) parent.children.push(el);
      else if (root) fail(at, `A second root element <${name}>`, 'An XML file has exactly one root element.');
      else root = el;
      if (!selfClosing) stack.push(el);
    }

    const open = stack[stack.length - 1];
    if (open) fail(n, `<${open.name}> (line ${open.line}) is never closed`);
    if (!root) fail(n, 'No root element');
    return { declaration, root, wellFormed: true };
  } catch (e) {
    if (e instanceof Fatal) return { declaration, root, wellFormed: false };
    throw e;
  }
}

/** Child elements with this name. */
export function childrenNamed(el: XmlElement, name: string): XmlElement[] {
  return el.children.filter((c) => c.name === name);
}
