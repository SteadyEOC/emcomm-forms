// FLMSG writer. ICS-213 is golden-tested against a real FLMSG 4.0.24 save (test/samples/flmsg/, made-up
// data); the other forms still use made-up expectations from docs/flmsg-format.md until real saves exist
// (rule 3). The made-up tests ask for LF line ends to keep the expected strings readable.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crc16Modbus, encodeUtf8, flmsgExtension, formatFlmsgHeaderDate, wrapFlmsg, writeFlmsg } from '../src/index.js';

const golden213 = new Uint8Array(readFileSync(new URL('./samples/flmsg/ics213-4.0.24-windows.213', import.meta.url)));
const edited = [{ call: 'KE7KDQ', date: new Date(Date.UTC(2026, 10, 18, 22, 43, 44)) }];
const fields213: Record<string, string> = {
  inc: 'incident test #1',
  to: 'Jake Wolfstein',
  p1: 'Incident Commander',
  fm: 'John KE7KDQ',
  p2: 'Scribe',
  d1: '2026-11-18',
  t1: '1438L',
  sb: 'Test Msg #1',
  s1: 'The Man',
  p3: 'Radio Chief',
  mg:
    'This is a testmessgae with some special characters !@#$%&*()_+":?>< and we\'ll see how it goes. ' +
    'this is a long line without a wrap, at least specifically.\nenter\nalt enter\nspecial word: Café\nCaféCaféCafé',
};
const write213 = (fields: Record<string, string>, lineEnd?: 'crlf' | 'lf') =>
  encodeUtf8(writeFlmsg({ form: 'ics213', fields, editedBy: edited, ...(lineEnd ? { lineEnd } : {}) }));

describe('writeFlmsg golden: ICS-213 saved by FLMSG 4.0.24 on Windows', () => {
  it('matches the real file byte for byte (CRLF, LF-counted UTF-8 lengths, field order, header)', () => {
    expect(write213(fields213)).toEqual(golden213);
  });

  it('goes red when a field is wrong, missing, or the line ends differ', () => {
    expect(write213({ ...fields213, sb: 'Test Msg #2' })).not.toEqual(golden213);
    const { p3: _p3, ...noP3 } = fields213;
    expect(write213(noP3)).not.toEqual(golden213);
    expect(write213({ ...fields213, mg: fields213.mg!.replace('Café', 'Cafe') })).not.toEqual(golden213);
    expect(write213(fields213, 'lf')).not.toEqual(golden213);
  });

  it('matches a second save with the Responder tab filled (reply fields, :hdr_fm:)', () => {
    const real = new Uint8Array(readFileSync(new URL('./samples/flmsg/ics213-reply-4.0.24-windows.213', import.meta.url)));
    // Take the values from the file itself (CRLF -> LF, then tag, LF-counted UTF-8 length, value).
    const bytes = encodeUtf8(new TextDecoder().decode(real).replace(/\r\n/g, '\n'));
    const values: Record<string, string> = {};
    const text = new TextDecoder().decode(bytes);
    for (const m of text.matchAll(/^:([a-z0-9]+):(\d+) /gm)) {
      const start = encodeUtf8(text.slice(0, m.index! + m[0].length)).length;
      values[m[1]!] = new TextDecoder().decode(bytes.slice(start, start + Number(m[2])));
    }
    const { hdr_fm: _fm, hdr_ed: _ed, ...fields } = values;
    expect(Object.keys(fields)).toEqual(['inc', 'to', 'p1', 'fm', 'p2', 'd1', 't1', 'sb', 's1', 'p3', 's2', 'p4', 'd2', 't2', 'mg', 'rp']);
    const shuffled = Object.fromEntries(Object.entries(fields).reverse()); // order must come from the writer
    const write = (f: Record<string, string>) =>
      encodeUtf8(
        writeFlmsg({
          form: 'ics213',
          fields: f,
          sentBy: { call: 'KE7KDQ', date: new Date(Date.UTC(2026, 10, 18, 22, 49, 23)) },
          editedBy: [{ call: 'KE7KDQ', date: new Date(Date.UTC(2026, 10, 18, 22, 49, 44)) }],
        }),
      );
    expect(write(shuffled)).toEqual(real);
    expect(write({ ...shuffled, rp: shuffled.rp + '.' })).not.toEqual(real);
  });

  it('writes LF line ends on request, lengths unchanged', () => {
    const dec = (b: Uint8Array) => new TextDecoder().decode(b);
    expect(dec(write213(fields213, 'lf'))).toBe(dec(write213(fields213)).replace(/\r\n/g, '\n'));
  });
});

describe('writeFlmsg golden: ICS-309 saved by FLMSG 4.0.24 on Windows', () => {
  const real = new Uint8Array(readFileSync(new URL('./samples/flmsg/ics309-4.0.24-windows.309', import.meta.url)));
  const fields309 = {
    inc: 'myIncident',
    dfm: '2026-11-18',
    tfm: '1454L',
    dto: '2026-11-18',
    tto: '1454L',
    pre: 'johnhhfc',
    dtm: '2026-11-18, 1454L',
    net: 'scribe #54',
    opr: 'KE7KDQ',
  };
  const rows309 = [
    { tm: '1454L', fm: 'me', to: 'you', msg: 'my 1st msg!' },
    { tm: '1455L', fm: 'ic', to: 'plans', msg: 'need water & towels' },
    { tm: '1456L', fm: 'cert1', to: 'logs', msg: 'msh rcvd, good to go' },
  ];
  const write309 = (fields: Record<string, string>, rows: Record<string, string>[]) =>
    encodeUtf8(writeFlmsg({ form: 'ics309', fields, rows, editedBy: [{ call: 'KE7KDQ', date: new Date(Date.UTC(2026, 10, 18, 22, 57, 35)) }] }));

  it('matches the real file byte for byte (header fields, then rows tm to fm msg, zero-based)', () => {
    expect(write309(fields309, rows309)).toEqual(real);
  });

  it('goes red when a field or a row is wrong', () => {
    expect(write309({ ...fields309, net: 'scribe #55' }, rows309)).not.toEqual(real);
    expect(write309(fields309, rows309.slice(0, 2))).not.toEqual(real);
    expect(write309(fields309, [rows309[0]!, { ...rows309[1]!, to: 'ops' }, rows309[2]!])).not.toEqual(real);
  });
});

describe('writeFlmsg', () => {
  it('writes an ICS-213 in tag order, lengths in UTF-8 bytes, empty fields left out', () => {
    const out = writeFlmsg({
      form: 'ics213',
      lineEnd: 'lf',
      fields: { mg: 'Line one\r\nCafé', inc: 'Drill Alpha', to: 'Logistics', sb: '', fm: 'Shelter' },
    });
    expect(out).toBe('<flmsg>4.0.24\n<ics213>\n:inc:11 Drill Alpha\n:to:9 Logistics\n:fm:7 Shelter\n:mg:14 Line one\nCafé\n');
  });

  it('writes the header with year-day-month UTC times, one line per station', () => {
    const d = new Date(Date.UTC(2026, 10, 17, 6, 15, 0));
    expect(formatFlmsgHeaderDate(d)).toBe('20261711061500');
    const out = writeFlmsg({
      form: 'plaintext',
      lineEnd: 'lf',
      fields: { tt: 'Note' },
      sentBy: { call: 'ke7kdq', date: d },
      editedBy: [{ call: 'KE7KDQ', date: new Date(0) }, { call: 'KE7KDQ', date: d }],
    });
    expect(out).toBe('<flmsg>4.0.24\n:hdr_fm:22 \nKE7KDQ 20261711061500\n:hdr_ed:22 \nKE7KDQ 20261711061500\n<plaintext>\n:tt:4 Note\n');
  });

  it('writes ICS-309 rows with zero-based indexes, field by field', () => {
    const out = writeFlmsg({
      form: 'ics309',
      lineEnd: 'lf',
      fields: { inc: 'Drill', net: 'Test net' },
      rows: [{ tm: '1800', to: 'NCS', fm: 'W1AW', msg: 'Check-in' }, { tm: '1805', msg: 'Traffic' }],
    });
    expect(out).toBe(
      '<flmsg>4.0.24\n<ics309>\n:inc:5 Drill\n:net:8 Test net\n' +
        ':tm[0]:4 1800\n:to[0]:3 NCS\n:fm[0]:4 W1AW\n:msg[0]:8 Check-in\n:tm[1]:4 1805\n:msg[1]:7 Traffic\n',
    );
  });

  it('writes CSV text as one field', () => {
    expect(writeFlmsg({ form: 'csvform', lineEnd: 'lf', fields: { mg: 'a,b\n1,2' } })).toBe('<flmsg>4.0.24\n<csvform>\n:mg:7 a,b\n1,2\n');
  });

  it('knows the file extensions', () => {
    expect([flmsgExtension('ics213'), flmsgExtension('ics309'), flmsgExtension('plaintext'), flmsgExtension('csvform')]).toEqual(['.213', '.309', '.p2s', '.c2s']);
  });

  it('refuses what FLMSG would misread', () => {
    expect(() => writeFlmsg({ form: 'ics213', fields: { mg: 'see :rp: below', rp: 'ok' } })).toThrow(/wrong place/);
    // a tag text in a value is fine when that tag comes earlier or is not written
    expect(() => writeFlmsg({ form: 'ics213', fields: { mg: 'see :inc: and :rp:', inc: 'x' } })).not.toThrow();
  });

  it('refuses bad input', () => {
    expect(() => writeFlmsg({ form: 'ics999' as 'ics213', fields: {} })).toThrow(/unknown form/);
    expect(() => writeFlmsg({ form: 'ics213', fields: { subject: 'x' } })).toThrow(/not a ics213 field/);
    expect(() => writeFlmsg({ form: 'ics213', fields: { mg: 3 as unknown as string } })).toThrow(TypeError);
    expect(() => writeFlmsg({ form: 'ics213', fields: {}, rows: [{ tm: '1' }] })).toThrow(/no rows/);
    expect(() => writeFlmsg({ form: 'ics309', fields: {}, rows: [{ when: '1' }] })).toThrow(/not a row field/);
    expect(() => writeFlmsg({ form: 'ics309', fields: {}, rows: Array.from({ length: 35 }, () => ({ tm: '1' })) })).toThrow(/at most 34.*csvform/);
    expect(() => writeFlmsg({ form: 'plaintext', fields: {}, sentBy: { call: 'BAD CALL', date: new Date() } })).toThrow(/call sign/);
    expect(() => writeFlmsg({ form: 'plaintext', fields: {}, version: '4.0\n<x>' })).toThrow(/version/);
    expect(() => writeFlmsg({ form: 'plaintext', fields: {}, lineEnd: 'cr' as 'lf' })).toThrow(/lineEnd/);
  });
});

describe('crc16Modbus and wrapFlmsg', () => {
  it('matches the published CRC-16/MODBUS check value', () => {
    expect(crc16Modbus(encodeUtf8('123456789'))).toBe(0x4b37);
  });

  it('wraps a file with LF line ends and the checksum over name plus text', () => {
    const text = '<flmsg>4.0.24\r\n<csvform>\r\n:mg:3 a,b\r\n';
    const w = wrapFlmsg('log.c2s', text);
    const body = '[WRAP:fn log.c2s]<flmsg>4.0.24\n<csvform>\n:mg:3 a,b\n';
    const sum = crc16Modbus(encodeUtf8(body)).toString(16).toUpperCase().padStart(4, '0');
    expect(w).toBe(`[WRAP:beg][WRAP:lf]${body}[WRAP:chksum ${sum}][WRAP:end]`);
    expect(sum).toMatch(/^[0-9A-F]{4}$/);
  });

  it('refuses a file name FLMSG could not read back', () => {
    expect(() => wrapFlmsg('my log.c2s', 'x')).toThrow(RangeError);
    expect(() => wrapFlmsg('a]b', 'x')).toThrow(RangeError);
  });
});
