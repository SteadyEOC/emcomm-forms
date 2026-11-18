// Make an ICS-213 "Save Data" file. In Winlink Express (or Pat), open the ICS-213 form, click
// Load Data, pick this file, check it and submit: the program builds the message itself.
//
//   node examples/ics213-save-data.mjs > "ICS-213 drill.txt"
import { check, encodeUtf8, saveDataFields, writeSaveData } from 'emcomm-forms';

const text = writeSaveData('ICS-213', {
  inc_name: 'Exercise Cascade Quake',
  to_name: 'Logistics Section Chief',
  fm_name: 'Shelter Manager, North Shelter',
  Subjectline: 'Cots and water needed',
  Mdate: '2026-11-17',
  Mtime: '11:15',
  Message: 'North Shelter has 40 people and 25 cots.\nPlease send 20 cots and 200 litres of water.',
  Approved_Name: 'Pat Example',
  Approved_PosTitle: 'Shelter Manager',
  exbtn: true, // "this is an exercise" box
  IsExercise: '** THIS IS AN EXERCISE **',
});

// Check our own output before handing it over (strict: any warning fails).
const bytes = encodeUtf8(text);
const result = check(bytes, 'ICS-213 drill.txt', { profile: 'strict' });
if (!result.ok) throw new Error(`check failed: ${result.issues.map((i) => i.message).join('; ')}`);

process.stdout.write(text);
// The field keys for a form, with the ones the form fills in by itself:
process.stderr.write(`\n${saveDataFields('ICS-213').length} fields; fixed: ${saveDataFields('ICS-213').filter((f) => f.fixed !== undefined).map((f) => f.key).join(', ')}\n`);
