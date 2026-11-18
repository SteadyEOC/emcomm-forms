#!/usr/bin/env node
// emcomm-forms check [options] <file>... | emcomm-forms rules
// Reads files only; writes nothing but its report. Exit codes (ESLint style):
// 0 all files ok, 1 at least one file not ok, 2 usage error.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { check, formatIssue, listRules, toSarif } from '../dist/index.js';

const USAGE = `Usage:
  emcomm-forms check [--profile strict|standard|lenient|emergency]
                     [--rule <id|area/*>=off|info|warn|error]...
                     [--max-warnings N] [--format text|json|sarif] <file>...
  emcomm-forms rules

  --strict is --profile strict; --json is --format json.
Checks Winlink Save Data files, RMS_Express_Form_*.xml, FormData.txt, Pat .b2f and Winlink Express exports.
Exit: 0 all ok, 1 a file is not ok, 2 usage error.`;

const usage = (msg) => {
  if (msg) console.error(`emcomm-forms: ${msg}`);
  console.error(USAGE);
  process.exit(2);
};

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === 'rules') {
  for (const r of listRules()) console.log(`${r.id.padEnd(34)} ${r.level.padEnd(8)} ${r.fatal ? 'fatal ' : '      '} ${r.description}`);
  process.exit(0);
}
if (cmd !== 'check') usage();

const options = { rules: {} };
let format = 'text';
const files = [];
for (let k = 0; k < rest.length; k++) {
  const a = rest[k];
  const value = () => {
    const eq = a.indexOf('=');
    if (a.startsWith('--') && eq > 0) return a.slice(eq + 1);
    if (k + 1 >= rest.length) usage(`${a} needs a value`);
    return rest[++k];
  };
  const name = a.startsWith('--') ? a.split('=')[0] : a;
  if (name === '--strict') options.profile = 'strict';
  else if (name === '--json') format = 'json';
  else if (name === '--profile') options.profile = value();
  else if (name === '--format') format = value();
  else if (name === '--max-warnings') {
    const v = value();
    if (!/^\d+$/.test(v)) usage(`--max-warnings needs a whole number, got "${v}"`);
    options.maxWarnings = Number(v);
  } else if (name === '--rule') {
    const v = value();
    const eq = v.lastIndexOf('=');
    if (eq <= 0) usage(`--rule needs <id>=<setting>, got "${v}"`);
    options.rules[v.slice(0, eq)] = v.slice(eq + 1);
  } else if (a.startsWith('--')) usage(`unknown option ${a}`);
  else files.push(a);
}
if (!['text', 'json', 'sarif'].includes(format)) usage(`unknown format "${format}"`);
if (files.length === 0) usage('no files given');

try {
  check(new Uint8Array(), undefined, options); // validates profile and rule settings before any file is read
} catch (e) {
  if (e instanceof RangeError) usage(e.message);
  throw e;
}

let failed = false;
const results = [];
for (const f of files) {
  let bytes;
  try {
    bytes = new Uint8Array(readFileSync(f));
  } catch (e) {
    console.error(`${f}: ${e.message}`);
    failed = true;
    continue;
  }
  let r;
  try {
    r = check(bytes, basename(f), options);
  } catch (e) {
    if (e instanceof RangeError) usage(e.message);
    throw e;
  }
  if (!r.ok) failed = true;
  results.push({ uri: f, result: r });
  if (format === 'text') {
    const what = r.form ? `${r.kind}, ${r.form}` : r.kind;
    console.log(`${f} (${what}): ${r.errors} error(s), ${r.warnings} warning(s), ${r.infos} info`);
    for (const i of r.issues) console.log(`  ${formatIssue(i)}`);
  }
}
if (format === 'json') console.log(JSON.stringify(results.map(({ uri, result }) => ({ path: uri, ...result })), null, 2));
if (format === 'sarif') console.log(JSON.stringify(toSarif(results), null, 2));
process.exit(failed ? 1 : 0);
