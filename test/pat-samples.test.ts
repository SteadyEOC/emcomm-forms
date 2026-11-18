// Real Pat 1.0.1 files with made-up data (public, in test/samples/pat/) must give no issues:
// outbox messages (.b2f) and the forms' Save Data output (-savedata.txt).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { check, formatIssue } from '../src/index.js';

const dir = fileURLToPath(new URL('./samples/pat/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.b2f') || f.endsWith('-savedata.txt'));

/** Form each sample must be recognised as, by file-name part. */
const FORM_OF: [RegExp, string][] = [
  [/ics213rr/, 'ICS-213RR'],
  [/ics213-/, 'ICS-213'],
  [/ics214/, 'ICS-214'],
  [/ics205/, 'ICS-205'],
  [/hics251/, 'HICS-251'],
  [/hospital-status/, 'Hospital Status'],
  [/field-situation/, 'Field Situation'],
];

describe('Pat samples (test/samples/pat)', () => {
  it('finds the samples', () => {
    expect(files.filter((f) => f.endsWith('-savedata.txt')).length).toBeGreaterThanOrEqual(7);
  });
  for (const f of files) {
    it(`has zero issues under the standard profile: ${f}`, () => {
      const r = check(new Uint8Array(readFileSync(join(dir, f))), f);
      expect(r.kind).toBe(f.endsWith('.b2f') ? 'b2f' : 'save-data');
      // Form messages are recognised by their viewer XML's display_form; plain messages by none.
      expect(r.form).toBe(FORM_OF.find(([re]) => re.test(f))?.[1]);
      expect(r.issues.map(formatIssue)).toEqual([]);
      expect(r.ok).toBe(true);
    });
  }
});
