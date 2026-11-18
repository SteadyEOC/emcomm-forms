const MAP: Record<string, string> = {
  'ß': 'ss', 'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE', 'ø': 'o', 'Ø': 'O',
  'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D', 'þ': 'th', 'Þ': 'Th',
  '‘': "'", '’': "'", '‚': "'", '‛': "'",
  '“': '"', '”': '"', '„': '"', '‟': '"',
  '‐': '-', '‑': '-', '‒': '-', '–': '-', '—': '-', '―': '-', '−': '-',
  '…': '...',
};

function isUnicodeSpace(cp: number): boolean {
  return (
    cp === 0xa0 || cp === 0x1680 || (cp >= 0x2000 && cp <= 0x200a) ||
    cp === 0x202f || cp === 0x205f || cp === 0x3000
  );
}

/**
 * Fold text to plain ASCII: accents are dropped ("José" becomes "Jose"), common
 * ligatures, quotes, dashes and spaces are mapped to ASCII look-alikes, and
 * anything else non-ASCII becomes "?" (one per code point). Tab, CR and LF are kept.
 */
export function asciiFold(s: string): string {
  if (typeof s !== 'string') throw new TypeError('asciiFold: expected a string');
  let out = '';
  for (const ch of s.normalize('NFKD')) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x300 && cp <= 0x36f) continue;
    const mapped = MAP[ch];
    if (mapped !== undefined) out += mapped;
    else if (isUnicodeSpace(cp)) out += ' ';
    else if (cp < 0x80) out += ch;
    else out += '?';
  }
  return out;
}
