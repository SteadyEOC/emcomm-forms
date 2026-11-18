// Make the tester pack: files written by this library, with made-up data, for operators to try in
// Winlink Express, Pat and FLMSG. Writes into the folder given (default ./tester-pack).
//
//   node examples/make-tester-pack.mjs tester-pack
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { check, encodeUtf8, VERSION, writeFlmsg, writeSaveData } from 'emcomm-forms';

const out = process.argv[2] ?? 'tester-pack';
mkdirSync(out, { recursive: true });
const files = [];
const put = (name, text) => {
  const bytes = encodeUtf8(text);
  if (name.endsWith('.txt') && !name.startsWith('READ')) {
    const r = check(bytes, name, { profile: 'strict' });
    if (!r.ok) throw new Error(`${name}: ${r.issues.map((i) => i.message).join('; ')}`);
  }
  writeFileSync(join(out, name), bytes);
  files.push(name);
};

const exercise = { exbtn: 1, IsExercise: '** THIS IS AN EXERCISE **' };

put('ICS-213 test 1 plain.txt', writeSaveData('ICS-213', {
  ...exercise,
  inc_name: 'Exercise Cascade Quake',
  to_name: 'Logistics Section Chief',
  fm_name: 'Shelter Manager, North Shelter',
  Subjectline: 'Cots and water needed',
  Mdate: '2026-11-18',
  Mtime: '11:15',
  Message: 'North Shelter has 40 people and 25 cots.\nPlease send 20 cots and 200 litres of drinking water by 16:00 today.\nRoad access is from the north gate only.',
  Approved_Name: 'Pat Example',
  Approved_PosTitle: 'Shelter Manager',
}));

put('ICS-213 test 2 awkward text.txt', writeSaveData('ICS-213', {
  ...exercise,
  inc_name: 'Exercise "Café" & <Fog>',
  to_name: 'José Núñez, Logistics',
  fm_name: 'Zoë Åberg / Shelter #2',
  Subjectline: 'Water: 200 L & 20 cots (urgent?)',
  Mdate: '2026-11-18',
  Mtime: '11:20',
  Message:
    'Line 1: ampersand & less-than < greater-than > quotes "double" \'single\'.\n' +
    'Line 2: accents é ñ ü ø ß, dash – em dash — ellipsis …, degree 47°N.\n' +
    'Line 3: backslash \\ slash / percent 100% plus + equals = colon : semicolon ;\n\n' +
    'Line 5 after a blank line. ' + 'This sentence makes a long line that should wrap in the form. '.repeat(4).trim(),
  Approved_Name: 'Pat Example',
  Approved_PosTitle: 'Shelter Manager',
}));

put('ICS-213RR test.txt', writeSaveData('ICS-213RR', {
  IncName: 'Exercise Cascade Quake',
  ActivityDateTime1: '2026-11-18 11:30',
  ReqNum: 'RR-TEST-001',
  Qty1: '20', Kind1: 'Supply', Type1: 'Kit', Item1: 'Cots, folding, with blankets', ReqDateTime1: '2026-11-18 16:00',
  Qty2: '200', Kind2: 'Supply', Type2: 'L', Item2: 'Drinking water', ReqDateTime2: '2026-11-18 16:00',
  Delivery: 'North Shelter, north gate',
  ReqName: 'Pat Example, Shelter Manager',
  Priority: 'Urgent',
  SecApp: 'Sam Example, Logistics',
}));

put('ICS-214 test.txt', writeSaveData('ICS-214', {
  Incident_Name: 'Exercise Cascade Quake',
  Page: '1',
  DateTimeFrom: '2026-11-18 08:00',
  DateTimeTo: '2026-11-18 20:00',
  Name: 'Pat Example',
  ICS_Position: 'Radio Operator',
  Home_Agency: 'Test County ARES',
  Name1: 'Sam Example', ICS_Position1: 'Net Control', Home_Agency1: 'Test County ARES',
  ActivityDateTime1: '2026-11-18 08:05', Activities1: 'Opened net on the drill repeater.',
  ActivityDateTime2: '2026-11-18 11:30', Activities2: 'Sent ICS-213RR RR-TEST-001 for cots & water.',
  PreparedName: 'Pat Example, Radio Operator',
}));

put('ICS-205 test.txt', writeSaveData('ICS-205', {
  Incident_Name: 'Exercise Cascade Quake',
  DateFrom: '2026-11-18', DateTo: '2026-11-19', TimeFrom: '08:00', TimeTo: '08:00',
  Function1: 'Command', ChannelName1: 'DRILL CMD', Assignment1: 'Net Control',
  RX1: '146.520', TX1: '146.520', Mode1: 'A', Remarks1: 'Simplex, made-up drill plan',
  PreparedName: 'Pat Example, COML',
}));

// FLMSG (untested against real FLMSG saves: that's what we need testers for).
put('drill.213', writeFlmsg({
  form: 'ics213',
  fields: {
    inc: 'Exercise Cascade Quake', to: 'Logistics Section Chief', p1: 'Logistics', fm: 'Shelter Manager', p2: 'North Shelter',
    sb: 'Cots and water needed', d1: '2026-11-18', t1: '11:15',
    mg: 'North Shelter has 40 people and 25 cots.\nPlease send 20 cots and 200 litres of water by 16:00.', s1: 'Pat Example', p3: 'Shelter Manager',
  },
}));
put('drill-accents.213', writeFlmsg({
  form: 'ics213',
  fields: { inc: 'Exercise Café', to: 'José Núñez', fm: 'Zoë Åberg', sb: 'Accents é ñ ü ø ß', mg: 'Accents: é ñ ü ø ß — and symbols & < > " \'.' },
}));
put('log.309', writeFlmsg({
  form: 'ics309',
  fields: { inc: 'Exercise Cascade Quake', dfm: '2026-11-18', tfm: '08:00', dto: '2026-11-18', tto: '20:00', net: 'Drill net', opr: 'Pat Example' },
  rows: [
    { tm: '0805', to: 'All', fm: 'NCS', msg: 'Net open' },
    { tm: '1115', to: 'Logistics', fm: 'North Shelter', msg: 'ICS-213 cots and water' },
    { tm: '1130', to: 'North Shelter', fm: 'Logistics', msg: 'ICS-213RR RR-TEST-001' },
  ],
}));
put('note.p2s', writeFlmsg({
  form: 'plaintext',
  fields: { tt: 'Drill note', to: 'Net Control', fm: 'North Shelter', sb: 'Check-in', dt: '2026-11-18', tm: '08:10', mg: 'North Shelter on the air.\nAll made-up drill data.' },
}));

put('READ ME.txt', [
  `emcomm-forms ${VERSION} tester pack (all data made up)`,
  '',
  'Winlink Express or Pat: open the matching standard form (ICS-213, ICS-213RR, ICS-214, ICS-205),',
  'click Load Data and pick the .txt file. Does every field fill in as you would expect?',
  'Please do not send these to real addresses; address them to yourself or delete them.',
  '',
  'FLMSG: open drill.213, drill-accents.213, log.309 and note.p2s. Do they open with every field in place?',
  'Then save each one from FLMSG under a new name and send us that file: it shows us FLMSG\'s own format.',
  '',
  'Report: program and version (Help > About), Standard Forms version, what went wrong, and a screenshot.',
  '',
].join('\r\n'));

console.log(`${files.length} files in ${out}:\n  ${files.join('\n  ')}`);
