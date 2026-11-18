// RMS_Express_Form_<form>.xml: the viewer XML a form message carries.

import { CLIENT_VARIABLES, FORMS, OPTIONAL_CLIENT_VARIABLES, formByDisplayForm } from './forms.js';
import type { Sink } from './issue.js';
import { decodeXmlBytes, parseXml, type XmlElement } from './xml-parse.js';

const PARAMS = [
  'xml_file_version', 'rms_express_version', 'submission_datetime', 'senders_callsign', 'grid_square',
  'display_form', 'reply_template',
];
const GRID = /^[A-R]{2}[0-9]{2}(?:[A-X]{2}(?:[0-9]{2})?)?$/i;

export interface ViewerResult {
  form?: string;
  /** Variables by name, for cross-checks. */
  variables?: Map<string, string>;
}

export function isValidCompactUtc(s: string): boolean {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d, h, mi, se] = m.slice(1).map(Number) as [number, number, number, number, number, number];
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi, se));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d && h < 24 && mi < 60 && se < 60;
}

export function checkViewerXml(bytes: Uint8Array, sink: Sink, fileName?: string): ViewerResult {
  const text = decodeXmlBytes(bytes, sink, '');
  const doc = parseXml(text, sink, '');
  if (!doc.declaration) {
    sink.add('viewer/no-declaration', '', 'No XML declaration', { hint: 'WE writes <?xml version="1.0"?>; Pat adds encoding="UTF-8".' });
  }
  const root = doc.root;
  if (!doc.wellFormed || !root) return {};
  if (root.name !== 'RMS_Express_Form') {
    sink.add('viewer/wrong-root', root.name, `Root element is <${root.name}>, not <RMS_Express_Form>`, { line: root.line });
    return {};
  }

  const one = (name: string): XmlElement | undefined => {
    const found = root.children.filter((c) => c.name === name);
    if (found.length === 0) {
      sink.add('viewer/missing-element', `RMS_Express_Form/${name}`, `Missing <${name}>`, { line: root.line });
    } else if (found.length > 1) {
      sink.add('viewer/duplicate-element', `RMS_Express_Form/${name}`, `<${name}> appears ${found.length} times`, { line: found[1]!.line });
    }
    return found[0];
  };
  const params = one('form_parameters');
  const vars = one('variables');
  for (const c of root.children) {
    if (c.name !== 'form_parameters' && c.name !== 'variables') {
      sink.add('viewer/unexpected-element', `RMS_Express_Form/${c.name}`, `Unexpected element <${c.name}>`, { line: c.line });
    }
  }
  if (params && vars && root.children.indexOf(params) > root.children.indexOf(vars)) {
    sink.add('viewer/element-order', 'RMS_Express_Form', '<variables> comes before <form_parameters>', { line: vars.line });
  }

  const result: ViewerResult = {};
  if (params) checkParams(params, sink, fileName, result);
  if (vars) checkVariables(vars, sink, result);
  if (result.form && result.variables) checkFormVariables(result.form, result.variables, sink);
  return result;
}

function leafChecks(el: XmlElement, path: string, sink: Sink) {
  if (el.children.length) {
    sink.add('viewer/nested-element', path, `<${el.name}> holds elements; it must hold only text`, { line: el.line });
  }
  if (el.attrs.size) sink.add('viewer/unexpected-attributes', path, `<${el.name}> has attributes; none are expected`, { line: el.line });
}

function checkParams(params: XmlElement, sink: Sink, fileName: string | undefined, result: ViewerResult) {
  const base = 'form_parameters';
  const seen = new Map<string, XmlElement>();
  for (const c of params.children) {
    const path = `${base}/${c.name}`;
    leafChecks(c, path, sink);
    if (seen.has(c.name)) sink.add('viewer/duplicate-parameter', path, `<${c.name}> appears twice`, { line: c.line });
    seen.set(c.name, c);
    if (!PARAMS.includes(c.name)) sink.add('viewer/unknown-parameter', path, `Unknown form parameter <${c.name}>`, { line: c.line });
  }
  const order = params.children.map((c) => c.name).filter((n) => PARAMS.includes(n));
  const expected = PARAMS.filter((n) => seen.has(n));
  if (order.join() !== expected.join()) {
    sink.add('viewer/parameter-order', base, 'Form parameters are not in the usual order', { line: params.line, hint: PARAMS.join(', ') });
  }
  const val = (name: string) => seen.get(name)?.text.trim();
  const at = (name: string) => seen.get(name)?.line ?? params.line;

  const display = val('display_form');
  if (display === undefined || display === '') {
    sink.add('viewer/missing-display-form', `${base}/display_form`, 'Missing display_form: the receiver cannot pick a viewer', { line: at('display_form') });
  } else if (!/\.html?$/i.test(display)) {
    sink.add('viewer/display-form-extension', `${base}/display_form`, `display_form "${display}" does not end in .html`, { line: at('display_form') });
  }

  for (const name of ['xml_file_version', 'rms_express_version', 'submission_datetime', 'senders_callsign', 'reply_template']) {
    if (!seen.has(name)) sink.add('viewer/missing-parameter', `${base}/${name}`, `Missing <${name}>`, { line: params.line });
  }
  const xv = val('xml_file_version');
  if (xv !== undefined && xv !== '1.0') {
    sink.add('viewer/xml-version', `${base}/xml_file_version`, `xml_file_version is "${xv}"; only 1.0 has been seen`, { line: at('xml_file_version') });
  }
  const sd = val('submission_datetime');
  if (sd !== undefined && !isValidCompactUtc(sd)) {
    sink.add('viewer/datetime-format', `${base}/submission_datetime`, `submission_datetime "${sd}" is not yyyyMMddHHmmss (UTC)`, { line: at('submission_datetime') });
  }
  const grid = val('grid_square');
  if (grid !== undefined && grid !== '' && !GRID.test(grid)) {
    sink.add('viewer/grid-format', `${base}/grid_square`, `grid_square "${grid}" is not a Maidenhead locator`, { line: at('grid_square') });
  }

  if (fileName !== undefined && display) {
    const expectedName = `RMS_Express_Form_${display.replace(/\.html?$/i, '')}.xml`;
    if (!/^RMS_Express_Form_.+\.xml$/i.test(fileName)) {
      sink.add('viewer/file-name', 'file name', `"${fileName}" is not named RMS_Express_Form_*.xml, so clients won't treat it as a form`, {
        hint: `Name it ${expectedName}.`,
      });
    } else if (fileName.toLowerCase() !== expectedName.toLowerCase()) {
      sink.add('viewer/file-name-mismatch', 'file name', `"${fileName}" does not match display_form; expected ${expectedName}`);
    }
  }
  const form = display ? formByDisplayForm(display) : undefined;
  if (form) result.form = form.id;
}

function checkVariables(vars: XmlElement, sink: Sink, result: ViewerResult) {
  const values = new Map<string, string>();
  for (const c of vars.children) {
    const path = `variables/${c.name}`;
    leafChecks(c, path, sink);
    if (values.has(c.name)) {
      sink.add('viewer/duplicate-variable', path, `Variable <${c.name}> appears twice; readers may take either value`, { line: c.line });
    }
    if (c.name !== c.name.toLowerCase()) {
      sink.add('viewer/variable-case', path, `Variable <${c.name}> is not lower-case (WE and Pat lower-case every name)`, { line: c.line });
    }
    values.set(c.name.toLowerCase(), c.text);
  }
  result.variables = values;
  for (const name of CLIENT_VARIABLES) {
    if (!values.has(name)) sink.add('viewer/missing-client-variable', `variables/${name}`, `Missing client variable <${name}>`, { line: vars.line });
  }
}

/** Compare a viewer's variables with the field list of a known form. */
export function checkFormVariables(formId: string, variables: Map<string, string>, sink: Sink) {
  const spec = FORMS.find((f) => f.id === formId);
  if (!spec?.viewerVariables) return;
  const known = new Set([...spec.viewerVariables, ...CLIENT_VARIABLES, ...OPTIONAL_CLIENT_VARIABLES]);
  for (const name of spec.viewerVariables) {
    if (!variables.has(name)) {
      sink.add('viewer/missing-variable', `variables/${name}`, `${spec.id} variable <${name}> is missing`, {
        hint: 'Every template version seen so far writes it; the viewer may show that field blank.',
      });
    }
  }
  for (const name of variables.keys()) {
    if (!known.has(name)) sink.add('viewer/unknown-variable', `variables/${name}`, `Variable <${name}> is not in the ${spec.id} field list`);
  }
  const tv = variables.get('templateversion');
  if (tv !== undefined && !spec.templateVersions.includes(tv)) {
    sink.add('viewer/unverified-template', 'variables/templateversion', `Template version "${tv}" has not been checked against a real sample yet`);
  }
}
