// FLMSG writer, from docs/flmsg-format.md with made-up data. Not golden yet: no real FLMSG save
// exists in test/samples (rule 3). Replace with golden tests when samples arrive.
import { describe, expect, it } from 'vitest';
import { crc16Modbus, encodeUtf8, flmsgExtension, formatFlmsgHeaderDate, wrapFlmsg, writeFlmsg } from '../src/index.js';

describe('writeFlmsg', () => {
  it('writes an ICS-213 in tag order, lengths in UTF-8 bytes, empty fields left out', () => {
    const out = writeFlmsg({
      form: 'ics213',
      fields: { mg: 'Line one\r\nCafé', inc: 'Drill Alpha', to: 'Logistics', sb: '', fm: 'Shelter' },
    });
    expect(out).toBe('<flmsg>4.0.20\n<ics213>\n:inc:11 Drill Alpha\n:to:9 Logistics\n:fm:7 Shelter\n:mg:14 Line one\nCafé\n');
  });

  it('writes the header with year-day-month UTC times, one line per station', () => {
    const d = new Date(Date.UTC(2026, 10, 17, 6, 15, 0));
    expect(formatFlmsgHeaderDate(d)).toBe('20261711061500');
    const out = writeFlmsg({
      form: 'plaintext',
      fields: { tt: 'Note' },
      sentBy: { call: 'ke7kdq', date: d },
      editedBy: [{ call: 'KE7KDQ', date: new Date(0) }, { call: 'KE7KDQ', date: d }],
    });
    expect(out).toBe('<flmsg>4.0.20\n:hdr_fm:22 \nKE7KDQ 20261711061500\n:hdr_ed:22 \nKE7KDQ 20261711061500\n<plaintext>\n:tt:4 Note\n');
  });

  it('writes ICS-309 rows with zero-based indexes, field by field', () => {
    const out = writeFlmsg({
      form: 'ics309',
      fields: { inc: 'Drill', net: 'Test net' },
      rows: [{ tm: '1800', to: 'NCS', fm: 'W1AW', msg: 'Check-in' }, { tm: '1805', msg: 'Traffic' }],
    });
    expect(out).toBe(
      '<flmsg>4.0.20\n<ics309>\n:inc:5 Drill\n:net:8 Test net\n' +
        ':tm[0]:4 1800\n:to[0]:3 NCS\n:fm[0]:4 W1AW\n:msg[0]:8 Check-in\n:tm[1]:4 1805\n:msg[1]:7 Traffic\n',
    );
  });

  it('writes CSV text as one field', () => {
    expect(writeFlmsg({ form: 'csvform', fields: { mg: 'a,b\n1,2' } })).toBe('<flmsg>4.0.20\n<csvform>\n:mg:7 a,b\n1,2\n');
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
  });
});

describe('crc16Modbus and wrapFlmsg', () => {
  it('matches the published CRC-16/MODBUS check value', () => {
    expect(crc16Modbus(encodeUtf8('123456789'))).toBe(0x4b37);
  });

  it('wraps a file with LF line ends and the checksum over name plus text', () => {
    const text = '<flmsg>4.0.20\r\n<csvform>\r\n:mg:3 a,b\r\n';
    const w = wrapFlmsg('log.c2s', text);
    const body = '[WRAP:fn log.c2s]<flmsg>4.0.20\n<csvform>\n:mg:3 a,b\n';
    const sum = crc16Modbus(encodeUtf8(body)).toString(16).toUpperCase().padStart(4, '0');
    expect(w).toBe(`[WRAP:beg][WRAP:lf]${body}[WRAP:chksum ${sum}][WRAP:end]`);
    expect(sum).toMatch(/^[0-9A-F]{4}$/);
  });

  it('refuses a file name FLMSG could not read back', () => {
    expect(() => wrapFlmsg('my log.c2s', 'x')).toThrow(RangeError);
    expect(() => wrapFlmsg('a]b', 'x')).toThrow(RangeError);
  });
});
