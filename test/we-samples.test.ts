// Real Winlink Express files with made-up data (public, in test/samples/we/) must give no issues.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { check, formatIssue } from '../src/index.js';

const dir = fileURLToPath(new URL('./samples/we/', import.meta.url));
const saveData = readdirSync(dir).filter((f) => f.endsWith('-savedata.txt'));

describe('Winlink Express samples (test/samples/we)', () => {
  it('finds the Save Data samples', () => {
    expect(saveData.length).toBeGreaterThan(0);
  });
  for (const f of saveData) {
    it(`Save Data has zero issues under the standard profile: ${f}`, () => {
      const r = check(new Uint8Array(readFileSync(join(dir, f))), f);
      expect(r.kind).toBe('save-data');
      expect(r.issues.map(formatIssue)).toEqual([]);
      expect(r.ok).toBe(true);
    });
  }
});
