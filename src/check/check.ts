// check(bytes, name): detect the file type, run its checks, and check the form files
// found inside it (B2F attachments, MIME parts of a Winlink Express export).

import { resolveConfig, type CheckOptions, type Profile } from './config.js';
import { checkB2f } from './b2f.js';
import { checkFormDataTxt } from './form-data-txt.js';
import { FORMS, formByMapFileName } from './forms.js';
import { createSink, type Issue, type Sink } from './issue.js';
import { noopLogger } from '../log.js';
import { checkSaveData } from './save-data.js';
import { decodeLatin1 } from './text.js';
import { checkViewerXml } from './viewer-xml.js';
import { checkWinlinkExport } from './winlink-export.js';

export type FileKind = 'save-data' | 'viewer-xml' | 'form-data-txt' | 'b2f' | 'winlink-export' | 'unknown';

export interface CheckResult {
  kind: FileKind;
  /** The standard form recognised, e.g. 'ICS-213', when there is one. */
  form?: string;
  issues: Issue[];
  /** Number of issues at level error (a reader would break or misread the file). */
  errors: number;
  warnings: number;
  infos: number;
  /** No error-level issues and warnings within maxWarnings; always true under the 'emergency' profile. */
  ok: boolean;
  /** The profile used. */
  profile: Profile;
}

const base = (name: string | undefined) => (name ?? '').split(/[\\/]/).pop() ?? '';

/** Guess the file type from its first bytes, then its name. */
export function detectKind(bytes: Uint8Array, name?: string): FileKind {
  const head = decodeLatin1(bytes.subarray(0, 600)).replace(/^ï»¿/, '').trimStart();
  const file = base(name);
  if (head.startsWith('{')) return 'save-data';
  if (head.startsWith('<')) {
    if (head.includes('<Winlink_Express_message_export')) return 'winlink-export';
    if (head.includes('<RMS_Express_Form')) return 'viewer-xml';
  }
  if (/^Mid:/i.test(head) || /\.b2f$/i.test(file)) return 'b2f';
  if (head.startsWith('MapFileName:') || /^FormData\.txt$/i.test(file)) return 'form-data-txt';
  if (/^RMS_Express_Form_.*\.xml$/i.test(file)) return 'viewer-xml';
  return 'unknown';
}

/** Check the form files inside a message (attachments by name). Returns the form recognised. */
function checkFormAttachments(files: { name: string; bytes: Uint8Array }[], sink: Sink): string | undefined {
  let form: string | undefined;
  let mapFileName: string | undefined;
  let viewers = 0;
  for (const f of files) {
    if (/^RMS_Express_Form_.*\.xml$/i.test(f.name)) {
      viewers += 1;
      form = checkViewerXml(f.bytes, sink.nested(f.name), f.name).form ?? form;
    } else if (/^FormData\.txt$/i.test(f.name)) {
      mapFileName = checkFormDataTxt(f.bytes, sink.nested(f.name)).mapFileName;
    }
  }
  if (viewers > 1) sink.add('file/multiple-viewers', 'attachments', `${viewers} viewer XML attachments; a reader shows only one`);
  if (form && mapFileName !== undefined) {
    const spec = FORMS.find((s) => s.id === form);
    if (spec?.mapFileName !== undefined && spec.mapFileName.trim() !== mapFileName.trim()) {
      sink.add('file/form-data-mismatch', 'FormData.txt', `FormData.txt is for "${mapFileName}" but the viewer XML is ${form}`);
    }
  }
  return form;
}

/**
 * Check one file. Strict by default: an `error` means a reader (WE, Pat, the form viewer,
 * Load Data) would break or misread it; a `warning` means it differs from what WE or Pat write.
 */
export function check(bytes: Uint8Array, name?: string, options: CheckOptions = {}): CheckResult {
  const config = resolveConfig(options);
  const log = options.logger ?? noopLogger;
  const sink = createSink(name === undefined ? undefined : base(name), [], config);
  const kind = detectKind(bytes, name);
  log.debug('Detected file kind', { kind, file: name });
  let form: string | undefined;
  switch (kind) {
    case 'save-data':
      form = checkSaveData(bytes, sink).form;
      break;
    case 'viewer-xml':
      form = checkViewerXml(bytes, sink, name === undefined ? undefined : base(name)).form;
      break;
    case 'form-data-txt': {
      const map = checkFormDataTxt(bytes, sink).mapFileName;
      form = map === undefined ? undefined : formByMapFileName(map)?.id;
      break;
    }
    case 'b2f': {
      const parts = checkB2f(bytes, sink);
      if (parts) form = checkFormAttachments(parts.attachments, sink);
      break;
    }
    case 'winlink-export':
      for (const m of checkWinlinkExport(bytes, sink)) {
        form = checkFormAttachments(m.attachments, sink.nested(`message ${m.id ?? '?'}`)) ?? form;
      }
      break;
    case 'unknown':
      sink.add('file/unknown-kind', '', 'Not a file type this checker knows', {
        hint: 'Known: Save Data (.txt JSON), RMS_Express_Form_*.xml, FormData.txt, Pat .b2f, Winlink Express export .xml.',
      });
  }
  const count = (l: Issue['level']) => sink.issues.filter((x) => x.level === l).length;
  const errors = count('error');
  const warnings = count('warning');
  const ok = config.profile === 'emergency' || (errors === 0 && (config.maxWarnings === undefined || warnings <= config.maxWarnings));
  const result: CheckResult = { kind, issues: sink.issues, errors, warnings, infos: count('info'), ok, profile: config.profile };
  for (const i of sink.issues) {
    const fields = { rule: i.rule, file: i.file, line: i.line, path: i.path, kind };
    const msg = i.message;
    if (i.level === 'error') log.error(msg, fields);
    else if (i.level === 'warning') log.warn(msg, fields);
    else log.info(msg, fields);
  }
  if (form !== undefined) result.form = form;
  return result;
}

/** One line per issue, e.g. for a command line. */
export function formatIssue(i: Issue): string {
  const where = [i.file, i.line === undefined ? undefined : `line ${i.line}`, i.path || undefined].filter(Boolean).join(' ');
  return `${i.level.toUpperCase()} ${where ? `${where} ` : ''}[${i.rule}] ${i.message}${i.hint ? ` (${i.hint})` : ''}`;
}
