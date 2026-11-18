/** Replace every CRLF, CR and LF with `eol` (default CRLF). */
export function normaliseLineEndings(s: string, eol: string = '\r\n'): string {
  if (typeof s !== 'string') throw new TypeError('normaliseLineEndings: expected a string');
  if (typeof eol !== 'string') throw new TypeError('normaliseLineEndings: eol must be a string');
  return s.replace(/\r\n|\r|\n/g, () => eol);
}

export interface WrapOptions {
  /** Longest line allowed, in UTF-16 code units. Default 72. */
  width?: number;
  /** Line break for the output. Default CRLF. */
  eol?: string;
}

/**
 * Greedy word wrap. Existing line breaks and blank lines are kept, trailing
 * spaces and tabs are trimmed, words longer than the width are cut, and no line
 * exceeds the width. A line that already fits is left as it is (indent included);
 * a line that needs wrapping has its runs of spaces collapsed to one, but keeps
 * its leading indent on the first output line.
 */
export function wrapText(s: string, opts?: WrapOptions): string {
  if (typeof s !== 'string') throw new TypeError('wrapText: expected a string');
  const width = opts?.width ?? 72;
  const eol = opts?.eol ?? '\r\n';
  if (!Number.isInteger(width) || width < 1) throw new RangeError('wrapText: width must be a positive integer');
  if (typeof eol !== 'string') throw new TypeError('wrapText: eol must be a string');
  const out: string[] = [];
  for (const raw of s.split(/\r\n|\r|\n/)) {
    const line = raw.replace(/[ \t]+$/, '');
    if (line.length <= width) {
      out.push(line);
      continue;
    }
    const indent = /^[ \t]*/.exec(line)![0];
    const words = line.slice(indent.length).split(/[ \t]+/);
    words[0] = indent + words[0]!;
    let cur = '';
    for (const word of words) {
      if (cur !== '' && cur.length + 1 + word.length <= width) {
        cur += ' ' + word;
        continue;
      }
      if (cur !== '') out.push(cur);
      cur = word;
      while (cur.length > width) {
        let cut = width;
        const c = cur.charCodeAt(cut - 1);
        if (width > 1 && c >= 0xd800 && c <= 0xdbff) cut -= 1; // do not split a surrogate pair
        out.push(cur.slice(0, cut));
        cur = cur.slice(cut);
      }
    }
    out.push(cur);
  }
  return out.join(eol);
}
