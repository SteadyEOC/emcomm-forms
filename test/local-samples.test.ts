// Runs the checker over the private real samples in the git-ignored samples-local/
// (rule 7 keeps them out of the repo). Real files from WE and Pat must pass with no
// errors: if one fails, the checker is wrong, not the file. Skipped where the folder
// is absent (CI, other clones).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { check, formatIssue, saveDataFields, saveDataTemplateVersion, writeSaveData } from '../src/index.js';

const dir = fileURLToPath(new URL('../samples-local/', import.meta.url));
const files = existsSync(dir)
  ? (readdirSync(dir, { recursive: true, encoding: 'utf8' }) as string[])
      .map((f) => join(dir, f))
      // FLMSG saves (any extension) wait for the checker's FLMSG layer; their writer has golden tests.
      .filter((f) => statSync(f).isFile() && /\.(b2f|xml|txt)$/i.test(f) && !/[\\/]fldigi[\\/]/i.test(f))
  : [];

describe.skipIf(files.length === 0)('real samples (samples-local, private)', () => {
  for (const f of files) {
    it(`passes with no errors: ${f.slice(dir.length)}`, () => {
      const r = check(new Uint8Array(readFileSync(f)), f);
      if (r.issues.length) console.log(r.issues.map(formatIssue).join('\n'));
      expect(r.kind).not.toBe('unknown');
      expect(r.issues.filter((i) => i.level === 'error').map(formatIssue)).toEqual([]);
    });
  }
});

// Real saves of the template version the writer targets must come back byte for byte from their
// operator fields (older versions, such as Hospital Status 2.2, are skipped).
describe.skipIf(files.length === 0)('writeSaveData rebuilds real saves (samples-local, private)', () => {
  for (const f of files) {
    const r = check(new Uint8Array(readFileSync(f)), f);
    if (r.kind !== 'save-data' || !r.form) continue;
    const text = readFileSync(f, 'utf8');
    const saved = JSON.parse(text) as Record<string, string>;
    if (saved['Templateversion'] !== saveDataTemplateVersion(r.form)) continue;
    // Saves from before the 2026-09-25 template edit include `parseme` where today's templates don't.
    if ('parseme' in saved !== saveDataFields(r.form).some((x) => x.key === 'parseme')) continue;
    it(`rebuilds ${f.slice(dir.length)}`, () => {
      const fixed = new Set(saveDataFields(r.form!).filter((x) => x.fixed !== undefined).map((x) => x.key));
      const values = Object.fromEntries(Object.entries(saved).filter(([k]) => !fixed.has(k)));
      expect(writeSaveData(r.form!, values)).toBe(text);
    });
  }
});
