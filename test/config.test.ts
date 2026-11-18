// Rule registry, profiles, overrides, ok/maxWarnings, logger and SARIF.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { check, createSink, formatIssue, listRules, noopLogger, RULES, toSarif, VERSION, type Logger } from '../src/index.js';

const utf8 = (s: string) => new TextEncoder().encode(s);

// One error (nested value, savedata/nested-value) and warnings (null, no Templateversion, ...).
const SAMPLE = utf8('{\n  "mapfilename": "ICS-213",\n  "a": null,\n  "b": [1]\n}');
const AMP = utf8('<RMS_Express_Form>\n<b>\nR&R</b></RMS_Express_Form>'); // '&' unescaped on line 3
const levelOf = (r: ReturnType<typeof check>, rule: string) => r.issues.find((i) => i.rule === rule)?.level;

describe('rule registry', () => {
  const dir = fileURLToPath(new URL('../src/check/', import.meta.url));
  const used = new Set<string>();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts') && n !== 'rules.ts')) {
    for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/'((?:xml|viewer|formdata|savedata|b2f|mime|export|file)\/[a-z0-9-]+)'/g)) used.add(m[1]!);
  }
  it('has every rule id used in the checkers', () => {
    expect(used.size).toBeGreaterThan(50);
    expect([...used].filter((id) => !(id in RULES))).toEqual([]);
  });
  it('uses every registered rule', () => {
    expect(Object.keys(RULES).filter((id) => !used.has(id))).toEqual([]);
  });
  it('names rules <area>/<kebab-name> with a description', () => {
    for (const r of listRules()) {
      expect(r.id).toMatch(/^(xml|viewer|formdata|savedata|b2f|mime|export|file)\/[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(r.description).not.toBe('');
    }
  });
  it('throws on an unknown rule id', () => {
    expect(() => createSink('x').add('b2f/no-such-rule', '', 'm')).toThrow(/Unknown checker rule/);
  });
});

describe('profiles', () => {
  it('standard (the default) uses the registry levels', () => {
    const r = check(SAMPLE, 'a.txt');
    expect(r.profile).toBe('standard');
    expect(levelOf(r, 'savedata/nested-value')).toBe('error');
    expect(levelOf(r, 'savedata/null-value')).toBe('warning');
    expect(r.ok).toBe(false);
    expect(r.errors).toBe(1);
    expect(r.warnings).toBeGreaterThan(0);
    expect(r.infos).toBe(0);
  });
  it('strict turns every warning into an error', () => {
    const r = check(SAMPLE, 'a.txt', { profile: 'strict' });
    expect(r.warnings).toBe(0);
    expect(levelOf(r, 'savedata/null-value')).toBe('error');
    expect(check(SAMPLE, 'a.txt').errors).toBeLessThan(r.errors);
  });
  it('lenient turns warnings into info and keeps errors', () => {
    const r = check(SAMPLE, 'a.txt', { profile: 'lenient' });
    expect(levelOf(r, 'savedata/nested-value')).toBe('error');
    expect(levelOf(r, 'savedata/null-value')).toBe('info');
    expect(r.warnings).toBe(0);
    expect(r.infos).toBeGreaterThan(0);
  });
  it('emergency reports everything but nothing is above warning, and ok is true', () => {
    const r = check(SAMPLE, 'a.txt', { profile: 'emergency' });
    expect(levelOf(r, 'savedata/nested-value')).toBe('warning');
    expect(r.errors).toBe(0);
    expect(r.ok).toBe(true);
    expect(r.issues.length).toBe(check(SAMPLE, 'a.txt').issues.length);
  });
  it('emergency is ok even for a fatal file (invalid JSON), still reported', () => {
    const r = check(utf8('{"a": '), 'bad.txt', { profile: 'emergency' });
    expect(r.issues.map((i) => [i.rule, i.level])).toEqual([['savedata/invalid-json', 'warning']]);
    expect(RULES['savedata/invalid-json']!.fatal).toBe(true);
    expect(r.ok).toBe(true);
    expect(check(utf8('{"a": '), 'bad.txt').ok).toBe(false);
  });
  it('emergency caps explicit error overrides too', () => {
    const r = check(SAMPLE, 'a.txt', { profile: 'emergency', rules: { 'savedata/null-value': 'error' } });
    expect(levelOf(r, 'savedata/null-value')).toBe('warning');
  });
  it('rejects an unknown profile', () => {
    expect(() => check(SAMPLE, 'a.txt', { profile: 'loose' as never })).toThrow(RangeError);
  });
});

describe('rule overrides', () => {
  it('sets an exact id', () => {
    const r = check(SAMPLE, 'a.txt', { rules: { 'savedata/nested-value': 'warn' } });
    expect(levelOf(r, 'savedata/nested-value')).toBe('warning');
    expect(r.ok).toBe(true);
  });
  it("'off' drops the issue", () => {
    const r = check(SAMPLE, 'a.txt', { rules: { 'savedata/null-value': 'off' } });
    expect(levelOf(r, 'savedata/null-value')).toBeUndefined();
  });
  it('wildcards set a whole area, and an exact id beats a wildcard', () => {
    const r = check(SAMPLE, 'a.txt', { rules: { 'savedata/*': 'info', 'savedata/nested-value': 'error' } });
    expect(levelOf(r, 'savedata/null-value')).toBe('info');
    expect(levelOf(r, 'savedata/nested-value')).toBe('error');
    expect(r.warnings).toBe(0);
  });
  it('accepts numeric settings 0, 1, 2', () => {
    const r = check(SAMPLE, 'a.txt', { rules: { 'savedata/null-value': 2, 'savedata/nested-value': 1, 'savedata/no-templateversion': 0 } });
    expect(levelOf(r, 'savedata/null-value')).toBe('error');
    expect(levelOf(r, 'savedata/nested-value')).toBe('warning');
    expect(levelOf(r, 'savedata/no-templateversion')).toBeUndefined();
  });
  it('applies on top of the profile', () => {
    const r = check(SAMPLE, 'a.txt', { profile: 'strict', rules: { 'savedata/null-value': 'info' } });
    expect(levelOf(r, 'savedata/null-value')).toBe('info');
    expect(levelOf(r, 'savedata/no-templateversion')).toBe('error');
  });
  it('throws a RangeError listing unknown keys', () => {
    expect(() => check(SAMPLE, 'a.txt', { rules: { 'b2f/nope': 'off', 'zzz/*': 'off' } })).toThrow(/b2f\/nope, zzz\/\*/);
    expect(() => check(SAMPLE, 'a.txt', { rules: { 'b2f/nope': 'off' } })).toThrow(RangeError);
  });
  it('throws on an invalid setting', () => {
    expect(() => check(SAMPLE, 'a.txt', { rules: { 'savedata/null-value': 'loud' as never } })).toThrow(RangeError);
  });
  it('reaches nested files (attachments) too', () => {
    const viewer = '<?xml version="1.0"?>\n<RMS_Express_Form><form_parameters/><variables><a>R&R</a></variables></RMS_Express_Form>';
    const r = check(utf8(viewer), 'RMS_Express_Form_ICS213_Initial_Viewer.xml', { rules: { 'xml/unescaped-amp': 'warn' } });
    expect(levelOf(r, 'xml/unescaped-amp')).toBe('warning');
  });
});

describe('ok and maxWarnings', () => {
  const clean = { rules: { 'savedata/nested-value': 'off' as const } };
  it('is ok with warnings only', () => {
    const r = check(SAMPLE, 'a.txt', clean);
    expect(r.errors).toBe(0);
    expect(r.warnings).toBeGreaterThan(1);
    expect(r.ok).toBe(true);
  });
  it('maxWarnings flips ok', () => {
    const n = check(SAMPLE, 'a.txt', clean).warnings;
    expect(check(SAMPLE, 'a.txt', { ...clean, maxWarnings: n }).ok).toBe(true);
    expect(check(SAMPLE, 'a.txt', { ...clean, maxWarnings: n - 1 }).ok).toBe(false);
    expect(check(SAMPLE, 'a.txt', { ...clean, maxWarnings: 0 }).ok).toBe(false);
  });
  it('emergency ignores maxWarnings', () => {
    expect(check(SAMPLE, 'a.txt', { profile: 'emergency', maxWarnings: 0 }).ok).toBe(true);
  });
});

describe('logger', () => {
  function recorder() {
    const calls: { level: string; msg: string; fields?: Record<string, unknown> }[] = [];
    const mk = (level: string) => (msg: string, fields?: Record<string, unknown>) => { calls.push(fields ? { level, msg, fields } : { level, msg }); };
    const logger: Logger = { debug: mk('debug'), info: mk('info'), warn: mk('warn'), error: mk('error') };
    return { calls, logger };
  }
  it('gets one entry per issue at the matching level, with fields, and a debug entry for the kind', () => {
    const { calls, logger } = recorder();
    const r = check(SAMPLE, 'dir/a.txt', { logger, rules: { 'savedata/null-value': 'info' } });
    expect(calls.filter((c) => c.level === 'debug')).toHaveLength(1);
    expect(calls.find((c) => c.level === 'debug')!.fields).toMatchObject({ kind: 'save-data' });
    expect(calls.length).toBe(r.issues.length + 1);
    const err = calls.find((c) => c.level === 'error')!;
    expect(err.fields).toMatchObject({ rule: 'savedata/nested-value', file: 'a.txt', kind: 'save-data' });
    expect(err.fields).toHaveProperty('path');
    expect(calls.find((c) => c.fields?.rule === 'savedata/null-value')!.level).toBe('info');
    expect(calls.some((c) => c.level === 'warn')).toBe(true);
  });
  it('carries the line where known', () => {
    const { calls, logger } = recorder();
    check(AMP, 'x.xml', { logger });
    expect(calls.find((c) => c.fields?.rule === 'xml/unescaped-amp')!.fields).toMatchObject({ line: 3 });
  });
  it('defaults to noop', () => {
    expect(() => noopLogger.error('x')).not.toThrow();
    expect(() => check(SAMPLE, 'a.txt', {})).not.toThrow();
  });
});

describe('formatIssue', () => {
  it('shows the rule id', () => {
    const r = check(AMP, 'x.xml');
    expect(formatIssue(r.issues[0]!)).toMatch(/^ERROR x\.xml line 3 \[xml\/unescaped-amp\] '&' is not escaped/);
  });
});

describe('SARIF', () => {
  const sarif = toSarif([{ uri: 'dir/a.txt', result: check(SAMPLE, 'a.txt', { rules: { 'savedata/null-value': 'info' } }) },
    { uri: 'b.xml', result: check(AMP, 'b.xml') }]) as any;
  it('is a SARIF 2.1.0 log naming the tool and all rules', () => {
    expect(sarif.version).toBe('2.1.0');
    const driver = sarif.runs[0].tool.driver;
    expect(driver.name).toBe('emcomm-forms');
    expect(driver.version).toBe(VERSION);
    expect(driver.rules.map((r: any) => r.id)).toEqual(Object.keys(RULES));
    expect(driver.rules[0].shortDescription.text).toBeTruthy();
  });
  it('maps issues to results with level, message and location', () => {
    const results = sarif.runs[0].results;
    const note = results.find((r: any) => r.ruleId === 'savedata/null-value');
    expect(note.level).toBe('note');
    expect(note.locations[0].physicalLocation.artifactLocation.uri).toBe('dir/a.txt');
    expect(results.find((r: any) => r.ruleId === 'savedata/nested-value').level).toBe('error');
    expect(results.find((r: any) => r.ruleId === 'savedata/no-templateversion').level).toBe('warning');
    const amp = results.find((r: any) => r.ruleId === 'xml/unescaped-amp');
    expect(amp.locations[0].physicalLocation.region.startLine).toBe(3);
    expect(amp.message.text).toContain('&amp;');
  });
  it('omits region when the line is unknown', () => {
    const r = sarif.runs[0].results.find((x: any) => x.ruleId === 'savedata/no-templateversion');
    expect(r.locations[0].physicalLocation.region).toBeUndefined();
  });
});
