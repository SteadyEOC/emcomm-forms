// Guards CONTRIBUTING.md rule 5 (pure, portable core) and rule 4 (make files, never transmit).
// Type-level DOM/Node use is already caught by tsconfig.json; this catches imports and globals.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/index.js';
import pkg from '../package.json' with { type: 'json' };

const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
const coreFiles = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith(".ts"))
  .map((f) => ({ name: f, text: readFileSync(join(srcDir, f), 'utf8') }));

const banned: [string, RegExp][] = [
  ['Node built-in import', /from\s+['"](node:|fs|path|os|child_process|net|http|https|dgram|tls)['"/]/],
  ['require()', /\brequire\s*\(/],
  ['network call', /\b(fetch|XMLHttpRequest|WebSocket)\s*\(/],
  ['DOM global', /\b(document|window|localStorage)\./],
  ['process global', /\bprocess\./],
  ['Buffer', /\bBuffer\./],
];

describe('core portability', () => {
  it('finds the core sources', () => {
    expect(coreFiles.length).toBeGreaterThan(0);
  });
  for (const [what, re] of banned) {
    it(`uses no ${what}`, () => {
      expect(coreFiles.filter((f) => re.test(f.text)).map((f) => f.name)).toEqual([]);
    });
  }
  it('has no runtime dependencies', () => {
    expect((pkg as { dependencies?: object }).dependencies ?? {}).toEqual({});
  });
  it('exports the package version', () => {
    expect(VERSION).toBe(pkg.version);
  });
});
