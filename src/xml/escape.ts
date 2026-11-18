/** True if the code point is allowed in XML 1.0 (the Char production). */
export function isXmlChar(codePoint: number): boolean {
  return (
    codePoint === 0x9 || codePoint === 0xa || codePoint === 0xd ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff)
  );
}

function escape(s: string, who: string, map: Record<string, string>): string {
  if (typeof s !== 'string') throw new TypeError(`${who}: expected a string`);
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (!isXmlChar(cp)) {
      throw new RangeError(`${who}: U+${cp.toString(16).toUpperCase().padStart(4, '0')} is not allowed in XML 1.0`);
    }
    out += map[ch] ?? ch;
  }
  return out;
}

const TEXT: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const ATTR: Record<string, string> = { ...TEXT, '"': '&quot;', "'": '&apos;' };

/** Escape & < > for element text. Throws RangeError on characters XML 1.0 forbids. */
export function escapeXmlText(s: string): string {
  return escape(s, 'escapeXmlText', TEXT);
}

/** Escape & < > " ' for attribute values. Throws RangeError on characters XML 1.0 forbids. */
export function escapeXmlAttr(s: string): string {
  return escape(s, 'escapeXmlAttr', ATTR);
}
