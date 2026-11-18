// Check a file before it goes out by radio, from code. (From a shell: npx emcomm-forms check <file>.)
//
//   node examples/check.mjs
import { check, encodeUtf8, formatIssue, toSarif } from 'emcomm-forms';

// A hand-made Save Data file with two mistakes: a key in the wrong case and a null value.
const bad = encodeUtf8(JSON.stringify({ mapfilename: 'ICS-213', Templateversion: 'ICS 213  v.43.8', subjectline: 'Hi', Message: null }, null, 2));

for (const profile of ['standard', 'emergency']) {
  const r = check(bad, 'bad.txt', { profile });
  console.log(`${profile}: kind=${r.kind} form=${r.form} ok=${r.ok} errors=${r.errors} warnings=${r.warnings}`);
}
const r = check(bad, 'bad.txt');
// Hide the "field is missing" warnings (this hand-made file leaves most fields out) to show the mistakes.
for (const issue of r.issues.filter((i) => i.rule !== 'savedata/missing-field')) console.log('  ' + formatIssue(issue));
// Strict (for tests and CI) fails on any warning:
console.log(`strict: ok=${check(bad, 'bad.txt', { profile: 'strict' }).ok}`);
console.log(`SARIF for code-scanning tools: ${JSON.stringify(toSarif([{ file: 'bad.txt', result: r }])).length} bytes`);
