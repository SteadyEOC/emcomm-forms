// FormData.txt: the form's map file (`Label:T=value` lines), byte-identical in WE and Pat.

import type { Sink } from './issue.js';
import { bareLfLines, decodeLatin1, describeLines, hasNonAscii } from './text.js';

// `Label:T=value`, `Label:M=value`, `Label:M:choice,choice=value`. Real Pat files (templates' own map
// files, 11-17) also have a space before the type (`03. Facility Name: T=...`) and bare headings
// with no value (`Status:M:`).
const LINE = /^([^:\r\n]+):\s*([TM])(?:(?::[^=]*)?=(.*)|:)$/;

export function checkFormDataTxt(bytes: Uint8Array, sink: Sink): { mapFileName?: string } {
  if (hasNonAscii(bytes)) {
    sink.add('formdata/non-ascii', '', 'Holds non-ASCII bytes', { hint: 'WE and Pat samples so far are plain ASCII; accented text is untested.' });
  }
  const text = decodeLatin1(bytes);
  const bare = bareLfLines(text);
  if (bare.length) sink.add('formdata/bare-lf', '', `Bare LF line end on line ${describeLines(bare)}`, { hint: 'WE and Pat write CRLF.' });
  const lines = text.split(/\r?\n/);
  let mapFileName: string | undefined;
  lines.forEach((line, k) => {
    // A whitespace-only line comes from the template itself (HICS-251 v .6 in Pat, 11-17).
    if (line !== '' && line.trim() === '') return;
    if (line === '') {
      if (k !== lines.length - 1) sink.add('formdata/blank-line', '', 'Blank line', { line: k + 1 });
      return;
    }
    const m = LINE.exec(line);
    if (!m) {
      sink.add('formdata/bad-line', '', `Line is not "Label:T=value" or "Label:M=value"`, {
        line: k + 1,
        hint: 'Could be the continuation of a multi-line value; how WE writes those is not yet known.',
      });
      return;
    }
    if (k === 0) {
      if (m[1] === 'MapFileName') mapFileName = (m[3] ?? '').trim();
      else sink.add('formdata/no-mapfilename', 'MapFileName', 'First line is not MapFileName:T=...', { line: 1 });
    }
  });
  return mapFileName === undefined ? {} : { mapFileName };
}
