// writeSaveData against real saves (rule 3): each public Save Data sample (Pat 1.0.1 and Winlink
// Express 1.8.6.0, made-up data) is rebuilt byte for byte from its operator fields alone.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  check,
  encodeUtf8,
  formatIssue,
  SAVE_DATA_FORMS,
  saveDataFields,
  saveDataTemplateVersion,
  writeSaveData,
  type SaveDataValue,
} from '../src/index.js';

const samples = ['pat', 'we'].flatMap((sub) => {
  const dir = fileURLToPath(new URL(`./samples/${sub}/`, import.meta.url));
  return readdirSync(dir)
    .filter((f) => f.endsWith('-savedata.txt'))
    .map((f) => ({ name: `${sub}/${f}`, bytes: new Uint8Array(readFileSync(join(dir, f))) }));
});

/** The operator's fields of a saved file: everything the form doesn't fill in by itself. */
function operatorValues(formId: string, saved: Record<string, SaveDataValue>): Record<string, SaveDataValue> {
  const fixed = new Set(saveDataFields(formId).filter((f) => f.fixed !== undefined).map((f) => f.key));
  return Object.fromEntries(Object.entries(saved).filter(([k]) => !fixed.has(k)));
}

describe('writeSaveData: golden files', () => {
  it('has a sample for every form it writes', () => {
    const covered = new Set(samples.map((s) => check(s.bytes, s.name).form));
    expect([...SAVE_DATA_FORMS].sort()).toEqual([...covered].sort());
  });

  for (const s of samples) {
    it(`rebuilds ${s.name} byte for byte`, () => {
      const formId = check(s.bytes, s.name).form!;
      const text = new TextDecoder().decode(s.bytes);
      const saved = JSON.parse(text) as Record<string, SaveDataValue>;
      expect(saved['Templateversion']).toBe(saveDataTemplateVersion(formId));
      const out = writeSaveData(formId, operatorValues(formId, saved));
      expect(out).toBe(text);
      expect(encodeUtf8(out)).toEqual(s.bytes);
    });
  }
});

describe('writeSaveData: output', () => {
  for (const formId of SAVE_DATA_FORMS) {
    it(`an empty ${formId} passes the strict checker as that form`, () => {
      const r = check(encodeUtf8(writeSaveData(formId, {})), 'x.txt', { profile: 'strict' });
      expect(r.form).toBe(formId);
      expect(r.issues.map(formatIssue)).toEqual([]);
    });
  }

  it('writes empty strings and 0 for fields left out', () => {
    const o = JSON.parse(writeSaveData('ICS-213', { Subjectline: 'Hi' }));
    expect(o.Subjectline).toBe('Hi');
    expect(o.inc_name).toBe('');
    expect(o.exbtn).toBe(0);
    expect(o.Templateversion).toBe('ICS 213  v.43.8');
    expect(o.mapfilename).toBe('ICS-213');
  });

  it('keeps awkward text as it is, with line breaks as LF', () => {
    const msg = 'Café & <tea> "quoted" \\ back\r\nsecond\rthird\ttab 日本';
    const o = JSON.parse(writeSaveData('ICS-213', { Message: msg }));
    expect(o.Message).toBe('Café & <tea> "quoted" \\ back\nsecond\nthird\ttab 日本');
  });

  it('writes booleans for checkboxes as 1 and 0', () => {
    expect(JSON.parse(writeSaveData('ICS-213', { exbtn: true })).exbtn).toBe(1);
    expect(JSON.parse(writeSaveData('ICS-213', { exbtn: false })).exbtn).toBe(0);
  });

  it('writes arrays of strings for multi-select lists', () => {
    expect(JSON.parse(writeSaveData('ICS-213', { Message: ['a', 'b'] })).Message).toEqual(['a', 'b']);
  });

  it('lists fields in the order written, with types and fixed values', () => {
    const f = saveDataFields('ICS-213');
    expect(f[0]).toEqual({ key: 'ShowDR', type: 'string' });
    expect(f.find((x) => x.key === 'exbtn')?.type).toBe('number');
    expect(f.find((x) => x.key === 'Templateversion')?.fixed).toBe('ICS 213  v.43.8');
    expect(Object.keys(JSON.parse(writeSaveData('ICS-213', {})))).toEqual(f.map((x) => x.key));
  });
});

describe('writeSaveData: refuses', () => {
  it('an unknown form', () => {
    expect(() => writeSaveData('ICS-999', {})).toThrow(/unknown form "ICS-999"; known: ICS-213/);
  });
  it('an unknown key', () => {
    expect(() => writeSaveData('ICS-213', { Subject: 'x' })).toThrow(/"Subject" is not a ICS-213 field/);
  });
  it('a key in the wrong case, naming the right one', () => {
    expect(() => writeSaveData('ICS-213', { subjectline: 'x' })).toThrow(/should be "Subjectline"/);
  });
  it('a field the form fills in itself', () => {
    expect(() => writeSaveData('ICS-213', { Templateversion: 'x' })).toThrow(/filled in by the form/);
    expect(() => writeSaveData('ICS-213', { FormData: 'x' })).toThrow(/filled in by the form/);
  });
  it('a value of the wrong type', () => {
    expect(() => writeSaveData('ICS-213', { exbtn: 'yes' })).toThrow(/checkbox/);
    expect(() => writeSaveData('ICS-213', { exbtn: Number.NaN })).toThrow(/checkbox/);
    expect(() => writeSaveData('ICS-213', { Message: 3 })).toThrow(/must be a string/);
    expect(() => writeSaveData('ICS-213', { Message: [1] as unknown as string[] })).toThrow(/must be a string/);
  });
  it('a lone surrogate or a control character', () => {
    expect(() => writeSaveData('ICS-213', { Message: 'a\uD800b' })).toThrow(/lone surrogate/);
    expect(() => writeSaveData('ICS-213', { Message: 'bell\u0007' })).toThrow(/U\+0007/);
    expect(() => writeSaveData('ICS-213', { Message: 'nul\u0000' })).toThrow(/U\+0000/);
  });
  it('values that are not an object', () => {
    expect(() => writeSaveData('ICS-213', null as unknown as Record<string, string>)).toThrow(TypeError);
  });
});
