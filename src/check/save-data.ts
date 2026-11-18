// The form's own "Save Data" file: a flat JSON object of field values that
// "Load Data" reads back (route 5). Loads in both WE and Pat.

import { formByMapFileName, formByTemplateVersion, OPTIONAL_SAVE_DATA_KEYS, saveDataKeysFor, type FormSpec } from './forms.js';
import type { Sink } from './issue.js';
import { decodeUtf8, lineIndex } from './text.js';

/** Top-level keys of a JSON object in source order, with the offset of each (finds duplicates). */
function topLevelKeys(text: string): { key: string; at: number }[] {
  const out: { key: string; at: number }[] = [];
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      const start = i;
      i += 1;
      while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
      if (depth === 1 && /^\s*:/.test(text.slice(i + 1, i + 20))) {
        out.push({ key: JSON.parse(text.slice(start, i + 1)) as string, at: start });
      }
    } else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
  }
  return out;
}

function identify(obj: Record<string, unknown>): FormSpec | undefined {
  // The map file key's case differs by form: mapfilename, MapFileName, Mapfilename.
  const mapKey = Object.keys(obj).find((k) => k.toLowerCase() === 'mapfilename');
  const map = mapKey === undefined ? undefined : obj[mapKey];
  const tv = obj['Templateversion'];
  return (typeof map === 'string' ? formByMapFileName(map) : undefined) ?? (typeof tv === 'string' ? formByTemplateVersion(tv) : undefined);
}

export function checkSaveData(bytes: Uint8Array, sink: Sink): { form?: string } {
  let body = bytes;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    sink.add('savedata/bom', '', 'Starts with a UTF-8 BOM', { hint: 'Saved files from WE and Pat have none; whether Load Data accepts one is untested.' });
    body = bytes.subarray(3);
  }
  const { text, badAt } = decodeUtf8(body);
  if (badAt >= 0) {
    sink.add('savedata/invalid-utf8', '', `Not valid UTF-8 (first bad byte at offset ${badAt})`, { hint: 'Write the file as UTF-8.' });
  }
  const lineOf = lineIndex(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    sink.add('savedata/invalid-json', '', `Not valid JSON: ${(e as Error).message}`, { hint: 'Load Data cannot read it.' });
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    sink.add('savedata/not-object', '', 'Not a JSON object', { hint: 'Save Data is one flat object of "field": "value" pairs.' });
    return {};
  }
  const obj = parsed as Record<string, unknown>;

  const seen = new Set<string>();
  for (const { key, at } of topLevelKeys(text)) {
    if (seen.has(key)) sink.add('savedata/duplicate-key', key, `Key "${key}" appears twice; Load Data keeps the last`, { line: lineOf(at) });
    seen.add(key);
  }
  const keyLine = new Map(topLevelKeys(text).map((k) => [k.key, lineOf(k.at)]));

  for (const [key, v] of Object.entries(obj)) {
    const line = keyLine.get(key);
    if (v === null) {
      sink.add('savedata/null-value', key, `"${key}" is null`, { line, hint: 'Write "" for an empty field.' });
    } else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      // A multi-select list: the templates' save code writes its chosen options as an array of strings.
    } else if (typeof v === 'object') {
      sink.add('savedata/nested-value', key, `"${key}" holds ${Array.isArray(v) ? 'an array' : 'an object'}`, {
        line,
        hint: 'Values are strings, a number for a checkbox (1 or 0), or an array of strings for a multi-select list. A form field would show [object Object].',
      });
    }
  }

  const form = identify(obj);
  if (!('Templateversion' in obj)) {
    sink.add('savedata/no-templateversion', 'Templateversion', 'No "Templateversion" key', { hint: 'Every saved file seen so far records the template version.' });
  }
  if (!form) return {};
  const keys = saveDataKeysFor(form, obj['Templateversion']);
  const known = new Set([...keys, ...OPTIONAL_SAVE_DATA_KEYS]);
  const byLower = new Map([...known].map((k) => [k.toLowerCase(), k]));
  for (const key of keys) {
    if (!(key in obj) && !OPTIONAL_SAVE_DATA_KEYS.includes(key)) {
      sink.add('savedata/missing-field', key, `${form.id} field "${key}" is missing`, { hint: 'Load Data leaves a missing field as it is (unverified).' });
    }
  }
  for (const key of Object.keys(obj)) {
    if (known.has(key)) continue;
    const right = byLower.get(key.toLowerCase());
    sink.add('savedata/unknown-field', key, right ? `"${key}" should be "${right}" (keys are case-sensitive)` : `"${key}" is not a ${form.id} field`, {
      line: keyLine.get(key),
    });
  }
  const tv = obj['Templateversion'];
  if (typeof tv === 'string' && !form.templateVersions.includes(tv)) {
    sink.add('savedata/unverified-template', 'Templateversion', `Template version "${tv}" has not been checked against a real sample yet`);
  }
  return { form: form.id };
}
