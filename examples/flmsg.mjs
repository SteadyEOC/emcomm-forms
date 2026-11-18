// FLMSG files for FLDIGI: an ICS-213 (.213) and an ICS-309 log (.309).
// Untested against real FLMSG saves so far: please report what FLMSG says when it opens them.
//
//   node examples/flmsg.mjs
import { flmsgExtension, wrapFlmsg, writeFlmsg } from 'emcomm-forms';

const ics213 = writeFlmsg({
  form: 'ics213',
  fields: {
    inc: 'Exercise Cascade Quake',
    to: 'Logistics Section Chief',
    fm: 'Shelter Manager',
    sb: 'Cots and water needed',
    d1: '2026-11-17',
    t1: '11:15',
    mg: 'Please send 20 cots and 200 litres of water.',
  },
  editedBy: [{ call: 'KE7KDQ', date: new Date(Date.UTC(2026, 10, 17, 19, 4)) }],
});
console.log(`--- drill${flmsgExtension('ics213')}\n${ics213}`);

const ics309 = writeFlmsg({
  form: 'ics309',
  fields: { inc: 'Exercise Cascade Quake', net: 'Drill net', opr: 'KE7KDQ' },
  rows: [
    { tm: '1800', to: 'NCS', fm: 'KE7KDQ', msg: 'Check-in' },
    { tm: '1805', to: 'Logistics', fm: 'Shelter', msg: 'ICS-213 cots and water' },
  ],
});
console.log(`--- log${flmsgExtension('ics309')}\n${ics309}`);

// What FLMSG sends over the air:
console.log(`--- wrapped\n${wrapFlmsg('drill.213', ics213)}`);
