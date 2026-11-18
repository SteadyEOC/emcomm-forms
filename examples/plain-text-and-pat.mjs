// A form as plain text (to paste into any client), then the same text as a Pat outbox message (.b2f).
//
//   node examples/plain-text-and-pat.mjs
import { check, writeB2f, writePlainText } from 'emcomm-forms';

const plain = writePlainText(
  {
    title: 'GENERAL MESSAGE (ICS 213)',
    fields: [
      { label: '1. Incident Name', value: 'Exercise Cascade Quake' },
      { label: '2. To', value: 'Logistics Section Chief' },
      { label: '3. From', value: 'Shelter Manager, North Shelter' },
      { label: '4. Subject', value: 'Cots and water needed' },
      { label: '5. Date', value: '2026-11-17' },
      { label: '6. Time', value: '11:15' },
      { label: '7. Message', value: 'North Shelter has 40 people and 25 cots. Please send 20 cots and 200 litres of drinking water by 16:00 today. Road access is from the north gate only.' },
      { label: '8. Approved by', value: 'Pat Example, Shelter Manager' },
    ],
  },
  { charset: 'us-ascii' }, // the default; every client and gateway passes it
);
console.log(plain.text.replaceAll('\r\n', '\n'));
console.log(plain.folded ? '(some characters were folded to ASCII)\n' : '');

// Pat reads .b2f files from its outbox folder; this library only makes the file (rule: never send).
const b2f = writeB2f({
  mid: 'EXAMPLE00001',
  date: new Date(Date.UTC(2026, 10, 17, 19, 4)),
  from: 'KE7KDQ',
  mbo: 'KE7KDQ',
  to: ['KE7KDQ'],
  subject: 'ICS-213: Cots and water needed',
  body: plain.text,
});
const r = check(b2f, 'EXAMPLE00001.b2f');
console.log(`.b2f: ${b2f.length} bytes, check: ${r.ok ? 'ok' : r.issues.map((i) => i.message).join('; ')}`);
