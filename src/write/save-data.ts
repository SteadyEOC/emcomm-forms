// Writer for a Winlink form's own "Save Data" file (route 5). The operator opens the form in Winlink
// Express or Pat, clicks Load Data, picks this file, checks it and submits; the client then builds the
// message body, viewer XML and FormData.txt itself.
//
// Format, from 17 real saves (Pat 1.0.1, WE 1.8.6.0 and 1.8.6.3; seven forms): exactly
// JSON.stringify(object, null, 2): LF line ends, two-space indent, no final newline, UTF-8 without a
// BOM, non-ASCII written as is. Keys in the template's own order.

import { FORMS, saveDataKeysFor, type FormSpec } from '../check/forms.js';
import { SAVE_DATA_LAYOUTS, type SaveDataLayout } from './save-data-layouts.js';

/**
 * A field value. Text for most fields; a number (or boolean, written as 1 or 0) for checkbox fields;
 * an array of strings for a multi-select list.
 */
export type SaveDataValue = string | number | boolean | readonly string[];

/** One field of a form's Save Data file, as {@link saveDataFields} lists it. */
export interface SaveDataField {
  /** Key, case as the template writes it. */
  key: string;
  /** `number` for checkbox state (1 or 0); `string` otherwise. */
  type: 'string' | 'number';
  /** Set when the form fills this field in by itself: the value the writer always writes. */
  fixed?: string;
}

/** Form ids {@link writeSaveData} can write, e.g. `ICS-213`. */
export const SAVE_DATA_FORMS: readonly string[] = Object.keys(SAVE_DATA_LAYOUTS);

function lookup(formId: string, who: string): { form: FormSpec; layout: SaveDataLayout; keys: string[] } {
  const layout = SAVE_DATA_LAYOUTS[formId];
  const form = FORMS.find((f) => f.id === formId);
  if (typeof formId !== 'string' || !layout || !form) {
    throw new RangeError(`${who}: unknown form "${String(formId)}"; known: ${SAVE_DATA_FORMS.join(', ')}`);
  }
  const keys = saveDataKeysFor(form, layout.templateVersion).filter((k) => k !== 'parseme' || layout.parseme);
  return { form, layout, keys };
}

function fixedValue(layout: SaveDataLayout, key: string): string | undefined {
  if (key === 'Templateversion') return layout.templateVersion;
  return Object.prototype.hasOwnProperty.call(layout.fixed, key) ? layout.fixed[key] : undefined;
}

/** The fields of a form's Save Data file, in the order they are written. */
export function saveDataFields(formId: string): SaveDataField[] {
  const { layout, keys } = lookup(formId, 'saveDataFields');
  return keys.map((key) => {
    const fixed = fixedValue(layout, key);
    const field: SaveDataField = { key, type: layout.numbers.includes(key) ? 'number' : 'string' };
    if (fixed !== undefined) field.fixed = fixed;
    return field;
  });
}

/** The template version {@link writeSaveData} writes for a form, e.g. `ICS 213  v.43.8`. */
export function saveDataTemplateVersion(formId: string): string {
  return lookup(formId, 'saveDataTemplateVersion').layout.templateVersion;
}

// Lone surrogates can't be written as UTF-8; C0 controls other than tab and line feed have no place in
// a form field (JSON would escape them, and the form would show junk).
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const BAD_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function cleanText(s: string, key: string): string {
  const t = s.replace(/\r\n|\r/g, '\n'); // a browser text box always holds LF
  if (LONE_SURROGATE.test(t)) throw new RangeError(`writeSaveData: "${key}" contains a lone surrogate (not valid Unicode)`);
  const bad = BAD_CONTROL.exec(t);
  if (bad) {
    const code = bad[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
    throw new RangeError(`writeSaveData: "${key}" contains control character U+${code}`);
  }
  return t;
}

/**
 * Write a form's Save Data file for the operator to open with the form's **Load Data** button.
 *
 * `values` holds the operator's fields by key (see {@link saveDataFields}); fields left out are written
 * empty (`""`, or `0` for a checkbox). Fields the form fills in by itself (`Templateversion`, the map
 * file name, `FormData`, ...) are always written as the form writes them.
 *
 * Throws a RangeError for an unknown form, an unknown or fixed key (keys are case-sensitive; a wrong
 * key would not load), a value of the wrong type, a lone surrogate or a control character other than
 * tab and line feed. Line breaks become LF.
 *
 * Returns the file's text; save it as UTF-8 without a BOM (`encodeUtf8`), with a `.txt` name.
 */
export function writeSaveData(formId: string, values: Readonly<Record<string, SaveDataValue>>): string {
  const { form, layout, keys } = lookup(formId, 'writeSaveData');
  if (typeof values !== 'object' || values === null || Array.isArray(values)) {
    throw new TypeError('writeSaveData: values must be an object of field values');
  }
  const known = new Set(keys);
  for (const key of Object.keys(values)) {
    if (!known.has(key)) {
      const right = keys.find((k) => k.toLowerCase() === key.toLowerCase());
      throw new RangeError(
        right
          ? `writeSaveData: "${key}" should be "${right}" (keys are case-sensitive)`
          : `writeSaveData: "${key}" is not a ${form.id} field`,
      );
    }
    if (fixedValue(layout, key) !== undefined) {
      throw new RangeError(`writeSaveData: "${key}" is filled in by the form itself and can't be set`);
    }
  }

  const out: Record<string, string | number | string[]> = {};
  for (const key of keys) {
    const fixed = fixedValue(layout, key);
    if (fixed !== undefined) {
      out[key] = fixed;
      continue;
    }
    const isNumber = layout.numbers.includes(key);
    const v = Object.prototype.hasOwnProperty.call(values, key) ? values[key] : undefined;
    if (v === undefined) {
      out[key] = isNumber ? 0 : '';
    } else if (isNumber) {
      if (typeof v === 'boolean') out[key] = v ? 1 : 0;
      else if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
      else throw new RangeError(`writeSaveData: "${key}" is a checkbox: give a number (1 or 0) or a boolean`);
    } else if (typeof v === 'string') {
      out[key] = cleanText(v, key);
    } else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      out[key] = v.map((x: string) => cleanText(x, key));
    } else {
      throw new RangeError(`writeSaveData: "${key}" must be a string (or an array of strings for a multi-select list)`);
    }
  }
  return JSON.stringify(out, null, 2);
}
