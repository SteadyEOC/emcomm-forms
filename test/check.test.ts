// Checker tests on made-up files shaped like the real WE 1.8.6.0 / Pat 0.19.2 samples
// (rule 7: no real data here). The real samples are checked in local-samples.test.ts.
import { describe, expect, it } from 'vitest';
import { check, createSink, detectKind, FORMS, formByTemplateVersion, parseXml, templateStem, type CheckResult } from '../src/index.js';

const enc = new TextEncoder();
const utf8 = (s: string) => enc.encode(s);
const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const errors = (r: CheckResult) => r.issues.filter((i) => i.level === 'error').map((i) => i.message);
const warnings = (r: CheckResult) => r.issues.filter((i) => i.level === 'warning').map((i) => i.message);

const ics213 = FORMS.find((f) => f.id === 'ICS-213')!;

// --- builders -------------------------------------------------------------------

function variables(over: Record<string, string> = {}): [string, string][] {
  const base: Record<string, string> = {};
  for (const v of ['msgto', 'msgcc', 'msgsender', 'msgsubject', 'msgbody', 'msgp2p', 'msgisreply', 'msgisforward',
    'msgisacknowledgement', 'msgseqnum', ...ics213.viewerVariables!]) base[v] = '';
  Object.assign(base, {
    msgsender: 'KE7KDQ', exbtn: 'true', inc_name: 'Drill', mapfilename: 'ICS-213', message: 'Test message',
    templateversion: 'ICS 213  v.43.8', grid: 'CN87uo', msgseqnum: '0',
  }, over);
  return Object.entries(base);
}

function viewerXml(opts: { vars?: [string, string][]; params?: Record<string, string | null>; decl?: string } = {}): string {
  const params: Record<string, string | null> = {
    xml_file_version: '1.0', rms_express_version: 'Test 1.0', submission_datetime: '20261116230019',
    senders_callsign: 'KE7KDQ', grid_square: 'CN87uo', display_form: 'ICS213_Initial_Viewer.html',
    reply_template: 'ICS213_SendReply.0', ...opts.params,
  };
  const p = Object.entries(params).filter(([, v]) => v !== null).map(([k, v]) => `    <${k}>${v}</${k}>`).join('\n');
  const v = (opts.vars ?? variables()).map(([k, val]) => `    <${k}>${val}</${k}>`).join('\n');
  return `${opts.decl ?? '<?xml version="1.0" encoding="UTF-8"?>'}\n<RMS_Express_Form>\n  <form_parameters>\n${p}\n  </form_parameters>\n  <variables>\n${v}\n  </variables>\n</RMS_Express_Form>`;
}
const VIEWER = 'RMS_Express_Form_ICS213_Initial_Viewer.xml';

const FORMDATA = 'MapFileName:T=ICS-213\r\n1. Incident Name:M=Drill\r\n7. Message:T=Test message';

function saveData(over: Record<string, unknown> = {}): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of ics213.saveDataKeys) o[k] = '';
  return { ...o, exbtn: 1, mapfilename: 'ICS-213', Templateversion: 'ICS 213  v.43.8', inc_name: 'Drill', ...over };
}
const saveBytes = (o: unknown) => utf8(JSON.stringify(o, null, 2));

interface B2fOpts { headers?: string[]; body?: Uint8Array; files?: { name: string; bytes: Uint8Array }[]; bodyCount?: number; tail?: string }
function b2f(o: B2fOpts = {}): Uint8Array {
  const body = o.body ?? latin1('Test message\r\n');
  const files = o.files ?? [];
  const headers = o.headers ?? [
    'Mid: ABC123DEF456', `Body: ${o.bodyCount ?? body.length}`, 'Content-Transfer-Encoding: 8bit',
    'Content-Type: text/plain; charset=ISO-8859-1', 'Date: 2026/11/16 23:00',
    ...files.map((f) => `File: ${f.bytes.length} ${f.name}`), 'From: KE7KDQ', 'Mbo: KE7KDQ', 'Subject: Test',
    'To: SMTP:someone@example.com', 'Type: Private',
  ];
  const parts = [latin1(headers.join('\r\n') + '\r\n\r\n'), body];
  for (const f of files) parts.push(latin1('\r\n'), f.bytes);
  parts.push(latin1(o.tail ?? (files.length ? '\r\n' : '')));
  return cat(...parts);
}

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/.{76}/g, '$&\r\n');
function weExport(o: { parts?: string; close?: boolean; id?: string } = {}): string {
  const parts = o.parts ?? [
    '--BND\r\nContent-Type: text/plain; charset="iso-8859-1"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nTest message=20\r\n',
    `--BND\r\nContent-Disposition: attachment; name="${VIEWER}";\r\n filename="${VIEWER}"\r\nContent-Type: text/xml;\r\n name="${VIEWER}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(utf8(viewerXml()))}\r\n`,
    `--BND\r\nContent-Disposition: attachment; name="FormData.txt";\r\n filename="FormData.txt"\r\nContent-Type: text/plain; name="FormData.txt"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(latin1(FORMDATA))}\r\n`,
  ].join('');
  const mime = `Date: Mon, 16 Nov 2026 22:58:45 +0000\r\nFrom: KE7KDQ@winlink.org\r\nSubject: Test\r\nTo: someone@example.com\r\nMessage-ID: ${o.id ?? 'ABC123DEF456'}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="BND"\r\n\r\n${parts}${o.close === false ? '' : '--BND--'}`;
  return `<?xml version="1.0"?>\r\n<Winlink_Express_message_export>\r\n  <export_parameters>\r\n    <xml_file_version>1.0</xml_file_version>\r\n  </export_parameters>\r\n  <message_list>\r\n    <message>\r\n      <id>${o.id ?? 'ABC123DEF456'}</id>\r\n      <mime>${mime}</mime>\r\n    </message>\r\n  </message_list>\r\n</Winlink_Express_message_export>\r\n`;
}

// --- tests ----------------------------------------------------------------------

describe('parseXml', () => {
  const parse = (s: string) => {
    const sink = createSink();
    return { doc: parseXml(s, sink, ''), issues: sink.issues };
  };
  it('reads elements, attributes, entities, character references and CDATA', () => {
    const { doc, issues } = parse('<?xml version="1.0"?>\n<a x="1 &amp; 2"><b>R&amp;R &lt;5&gt; &#233;&#x41;</b><c><![CDATA[<raw & stuff>]]></c><d/></a>');
    expect(issues).toEqual([]);
    expect(doc.declaration?.get('version')).toBe('1.0');
    expect(doc.root?.attrs.get('x')).toBe('1 & 2');
    expect(doc.root?.children.map((c) => c.text)).toEqual(['R&R <5> éA', '<raw & stuff>', '']);
  });
  const bad: [string, string, RegExp][] = [
    ['unescaped &', '<a>R&R</a>', /'&' is not escaped/],
    ['unknown entity', '<a>&nbsp;</a>', /Unknown entity &nbsp;/],
    ['mismatched end tag', '<a><b></a>', /does not match <b>/],
    ['unclosed element', '<a><b></b>', /<a> \(line 1\) is never closed/],
    ['second root', '<a/><b/>', /second root/],
    ['text outside root', '<a/>x', /Text outside the root/],
    ['control character', '<a>\u0001</a>', /U\+0001 is not allowed/],
    ['duplicate attribute', '<a x="1" x="2"/>', /appears twice/],
    ['< in attribute', '<a x="<"/>', /'<' in the value/],
    ['late declaration', '\n<?xml version="1.0"?><a/>', /very first thing/],
    ['internal DTD subset', '<!DOCTYPE a [<!ENTITY e "x">]><a/>', /internal subset/],
  ];
  for (const [what, xml, re] of bad) {
    it(`rejects ${what}`, () => {
      const { doc, issues } = parse(xml);
      expect(doc.wellFormed).toBe(false);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.message).toMatch(re);
    });
  }
  it('gives the line of the error', () => {
    expect(parse('<a>\n<b>\nR&R</b></a>').issues[0]!.line).toBe(3);
  });
});

describe('viewer XML', () => {
  it('passes a clean ICS-213 viewer', () => {
    const r = check(utf8(viewerXml()), VIEWER);
    expect(r.kind).toBe('viewer-xml');
    expect(r.form).toBe('ICS-213');
    expect(r.issues).toEqual([]);
  });
  it('errors on an unescaped & in a value', () => {
    expect(errors(check(utf8(viewerXml({ vars: variables({ message: 'R&R' }) })), VIEWER))).toEqual(["'&' is not escaped"]);
  });
  it('errors on a missing display_form', () => {
    expect(errors(check(utf8(viewerXml({ params: { display_form: null } })), VIEWER))).toEqual([
      'Missing display_form: the receiver cannot pick a viewer',
    ]);
  });
  it('errors on the wrong root', () => {
    expect(errors(check(utf8('<?xml version="1.0"?><RMS_Express_Form_X/>'), VIEWER))[0]).toMatch(/not <RMS_Express_Form>/);
  });
  it('errors on a duplicate variable and on a variable holding elements', () => {
    const vars = variables();
    vars.push(['message', 'again'], ['inc_name2', '<b>x</b>']);
    expect(errors(check(utf8(viewerXml({ vars })), VIEWER))).toEqual([
      'Variable <message> appears twice; readers may take either value',
      '<inc_name2> holds elements; it must hold only text',
    ]);
  });
  it('errors on bytes that are not UTF-8 with no encoding declared', () => {
    const r = check(latin1(viewerXml({ decl: '<?xml version="1.0"?>', vars: variables({ message: 'José' }) })), VIEWER);
    expect(errors(r)[0]).toMatch(/Not valid UTF-8/);
  });
  it('accepts ISO-8859-1 bytes when declared', () => {
    const r = check(latin1(viewerXml({ decl: '<?xml version="1.0" encoding="ISO-8859-1"?>', vars: variables({ message: 'José' }) })), VIEWER);
    expect(r.issues).toEqual([]);
  });
  it('warns on missing and unknown variables, upper case, odd dates and grid squares', () => {
    const vars = variables({ newfield: 'x' }).filter(([k]) => k !== 'mdate');
    vars.push(['Extra', '']);
    const r = check(utf8(viewerXml({ vars, params: { submission_datetime: '2026-11-16', grid_square: 'ZZ99' } })), VIEWER);
    expect(errors(r)).toEqual([]);
    expect(warnings(r)).toEqual([
      'submission_datetime "2026-11-16" is not yyyyMMddHHmmss (UTC)',
      'grid_square "ZZ99" is not a Maidenhead locator',
      'Variable <Extra> is not lower-case (WE and Pat lower-case every name)',
      'ICS-213 variable <mdate> is missing',
      'Variable <newfield> is not in the ICS-213 field list',
      'Variable <extra> is not in the ICS-213 field list',
    ]);
  });
  it('checks the attachment name against display_form', () => {
    expect(errors(check(utf8(viewerXml()), 'form.xml'))[0]).toMatch(/not named RMS_Express_Form_/);
    expect(warnings(check(utf8(viewerXml()), 'RMS_Express_Form_Other.xml'))[0]).toMatch(/does not match display_form/);
  });
  it('warns on an untested template version', () => {
    const r = check(utf8(viewerXml({ vars: variables({ templateversion: 'ICS 213  v.99' }) })), VIEWER);
    expect(warnings(r)).toEqual(['Template version "ICS 213  v.99" has not been checked against a real sample yet']);
  });
});

describe('FormData.txt', () => {
  it('passes a clean file', () => {
    const r = check(latin1(FORMDATA), 'FormData.txt');
    expect(r.kind).toBe('form-data-txt');
    expect(r.form).toBe('ICS-213');
    expect(r.issues).toEqual([]);
  });
  it('warns on bare LF, blank lines and lines it cannot read', () => {
    const r = check(latin1('MapFileName:T=ICS-213\n\r\nno equals here\r\nX:T=1'), 'FormData.txt');
    expect(warnings(r)).toEqual([
      'Bare LF line end on line 1',
      'Blank line',
      'Line is not "Label:T=value" or "Label:M=value"',
    ]);
  });
  it('accepts the template-made lines seen in Pat files: space before T, bare heading, blank-looking line', () => {
    const r = check(latin1('MapFileName:T=General Hospital Status\r\nStatus:M:\r\n03. Facility Name: T=Test\r\n   \r\nA:M:YES,NO=NO\r\n'), 'FormData.txt');
    expect(r.form).toBe('Hospital Status');
    expect(r.issues).toEqual([]);
    expect(warnings(check(latin1('MapFileName:T=x\r\nStatus:Q:\r\n'), 'FormData.txt'))).toEqual(['Line is not "Label:T=value" or "Label:M=value"']);
  });
});

describe('Save Data', () => {
  it('passes a clean ICS-213 file', () => {
    const r = check(saveBytes(saveData()), 'Drill ICS-213 data 2026-11-16 14_58.txt');
    expect(r.kind).toBe('save-data');
    expect(r.form).toBe('ICS-213');
    expect(r.issues).toEqual([]);
  });
  it('errors on invalid JSON, a non-object, nested values and bad UTF-8', () => {
    expect(errors(check(utf8('{"a": "b",}'))).length).toBe(1);
    expect(errors(check(utf8('{"a": [1]}')))).toEqual(['"a" holds an array']);
    expect(errors(check(utf8('{"a": ["North", "East"]}')))).toEqual([]); // multi-select list
    expect(errors(check(cat(utf8('{"a": "'), latin1('é'), utf8('"}'))))[0]).toMatch(/Not valid UTF-8/);
    expect(errors(check(saveBytes(saveData({ Message: { text: 'x' } }))))).toEqual(['"Message" holds an object']);
  });
  it('warns on wrong-case keys, unknown keys, duplicates, a BOM and a missing Templateversion', () => {
    const o = saveData({ mdate: '2026-11-16', bogus: 'x' });
    delete o['Mdate'];
    const text = JSON.stringify(o, null, 2).replace('{', '{\n  "inc_name": "first",');
    const r = check(cat(Uint8Array.of(0xef, 0xbb, 0xbf), utf8(text)));
    expect(errors(r)).toEqual([]);
    expect(warnings(r)).toEqual([
      'Starts with a UTF-8 BOM',
      'Key "inc_name" appears twice; Load Data keeps the last',
      'ICS-213 field "Mdate" is missing',
      '"mdate" should be "Mdate" (keys are case-sensitive)',
      '"bogus" is not a ICS-213 field',
    ]);
    const noTv = saveData();
    delete noTv['Templateversion'];
    expect(warnings(check(saveBytes(noTv)))).toContain('No "Templateversion" key');
  });
});

describe('Save Data of the other forms (keys from WE 1.8.6.3 saves)', () => {
  const blank = (id: string, over: Record<string, unknown> = {}) => {
    const spec = FORMS.find((f) => f.id === id)!;
    const o: Record<string, unknown> = {};
    for (const k of spec.saveDataKeys) o[k] = '';
    o['Templateversion'] = spec.templateVersions[0];
    return { spec, o: { ...o, ...over } };
  };
  const cases: [string, string][] = [
    ['ICS-213RR', 'ICS 213RR v. 14.6'],
    ['ICS-214', 'ICS 214 v 17.10'],
    ['ICS-205', 'ICS205- v 19.5'],
    ['HICS-251', 'HICS-251 v .6'],
    ['Hospital Status', 'General Hospital Status 2.2'],
    ['Field Situation', 'Field Situation Report V 0.1.5'],
  ];
  for (const [id, version] of cases) {
    it(`recognises a clean ${id} file`, () => {
      const { spec, o } = blank(id);
      expect(spec.templateVersions[0]).toBe(version);
      const r = check(saveBytes(o));
      expect(r.form).toBe(id);
      expect(r.issues).toEqual([]);
    });
  }
  it('finds the form by version stem when the version is new, and warns', () => {
    const r = check(saveBytes(blank('ICS-214', { Templateversion: 'ICS 214 v 18.1' }).o));
    expect(r.form).toBe('ICS-214');
    expect(warnings(r)).toEqual(['Template version "ICS 214 v 18.1" has not been checked against a real sample yet']);
  });
  it('reads the map file name whatever the key case', () => {
    const { spec, o } = blank('Hospital Status', { Templateversion: 'something else', Mapfilename: 'General Hospital Status' });
    expect(spec.mapFileName).toBe('General Hospital Status');
    expect(check(saveBytes(o)).form).toBe('Hospital Status');
    o['Mapfilename'] = 'Nothing known';
    expect(check(saveBytes(o)).form).toBeUndefined();
  });
  it('warns on a missing and an unknown field', () => {
    const { o } = blank('ICS-205', { Remarks11: 'x' });
    delete o['Ch1'];
    expect(warnings(check(saveBytes(o)))).toEqual([
      'ICS-205 field "Ch1" is missing',
      '"Remarks11" is not a ICS-205 field',
    ]);
  });
  it('lets parseme be left out, and uses the key list of the saved template version', () => {
    const { o } = blank('ICS-213RR');
    delete o['parseme'];
    expect(check(saveBytes(o)).issues).toEqual([]);
    const hs = FORMS.find((f) => f.id === 'Hospital Status')!;
    const v23 = hs.saveDataKeysByVersion!['General Hospital Status 2.3']!;
    const n: Record<string, unknown> = {};
    for (const k of v23) n[k] = '';
    n['Templateversion'] = 'General Hospital Status 2.3';
    expect(check(saveBytes(n)).issues).toEqual([]);
    n['Templateversion'] = 'General Hospital Status 2.2';
    expect(warnings(check(saveBytes(n)))).toContain('"StreetADDRESS" is not a Hospital Status field');
  });
  it('strips versions to a stem', () => {
    expect(['ICS 213  v.43.8', 'ICS 213RR v. 14.6', 'ICS205- v 19.5', 'HICS-251 v .6', 'General Hospital Status 2.2',
      'Field Situation Report V 0.1.5'].map(templateStem)).toEqual(['ICS 213', 'ICS 213RR', 'ICS205-', 'HICS-251',
      'General Hospital Status', 'Field Situation Report']);
    expect(formByTemplateVersion('ICS 213  v.44')?.id).toBe('ICS-213');
    expect(formByTemplateVersion('ICS 213RR v. 15')?.id).toBe('ICS-213RR');
  });
});

describe('Pat B2F', () => {
  const formFiles = () => [
    { name: 'FormData.txt', bytes: latin1(FORMDATA) },
    { name: VIEWER, bytes: utf8(viewerXml()) },
  ];
  it('passes a clean form message and checks its attachments', () => {
    const r = check(b2f({ files: formFiles() }), 'ABC123DEF456.b2f');
    expect(r.kind).toBe('b2f');
    expect(r.form).toBe('ICS-213');
    expect(r.issues).toEqual([]);
  });
  it('errors when Body counts characters instead of bytes', () => {
    const body = utf8('José\r\n');
    const r = check(b2f({ body, bodyCount: 'José\r\n'.length, files: formFiles() }), 'x.b2f');
    expect(errors(r)).toHaveLength(1);
    expect(errors(r)[0]).toMatch(/^Expected CRLF before attachment "FormData.txt" at byte \d+$/);
  });
  it('errors on a count that runs past the end, and on leftover bytes', () => {
    expect(errors(check(b2f({ bodyCount: 999 }), 'x.b2f'))[0]).toMatch(/Body says 999 bytes but only/);
    expect(errors(check(b2f({ tail: '\r\nextra' }), 'x.b2f'))).toEqual(['7 bytes after the last part']);
  });
  it('ends a no-attachment message right after the body; a trailing CRLF there is a warning', () => {
    expect(check(b2f(), 'x.b2f').issues).toEqual([]);
    expect(warnings(check(b2f({ tail: '\r\n' }), 'x.b2f'))).toEqual(['2 bytes after the last part']);
    expect(check(b2f({ files: formFiles(), tail: '' }), 'x.b2f').issues.map((i) => i.rule)).toEqual(['b2f/no-final-crlf']);
  });
  it('accepts RFC 2047 subjects, X-P2ponly and several Cc lines; warns on raw non-ASCII headers', () => {
    const h = ['Mid: ABC123DEF456', 'Body: 14', 'Content-Type: text/plain; charset=ISO-8859-1', 'Date: 2026/11/16 23:00',
      'From: KE7KDQ', 'Mbo: KE7KDQ', 'To: N0CALL', 'Cc: N1CALL', 'Cc: N2CALL', 'X-P2ponly: true', 'Type: Private'];
    expect(check(b2f({ headers: [...h, 'Subject: =?ISO-8859-1?q?Accented_test_=E9?='] }), 'x.b2f').issues).toEqual([]);
    const raw = check(b2f({ headers: [...h, 'Subject: café'] }), 'x.b2f');
    expect(raw.issues.map((i) => i.rule)).toEqual(['b2f/raw-non-ascii-header']);
  });
  it('errors on missing Mid, Date, From and To', () => {
    const r = check(b2f({ headers: ['Body: 14', 'Subject: x', 'Mbo: KE7KDQ', 'Type: Private'] }), 'x.b2f');
    expect(errors(r)).toEqual(['No Mid header', 'No Date header', 'No From header', 'No To header']);
  });
  it('reports a bad attachment with its nested file name', () => {
    const r = check(b2f({ files: [{ name: VIEWER, bytes: utf8(viewerXml({ vars: variables({ message: 'R&R' }) })) }] }), 'x.b2f');
    expect(r.issues.filter((i) => i.level === 'error').map((i) => [i.file, i.message])).toEqual([
      [`x.b2f > ${VIEWER}`, "'&' is not escaped"],
    ]);
  });
  it('warns on UTF-8 labelled ISO-8859-1, bare addresses and bare LF', () => {
    const body = utf8('José\nline 2\r\n');
    const r = check(b2f({ body, headers: ['Mid: ABC', `Body: ${body.length}`, 'Content-Type: text/plain; charset=ISO-8859-1',
      'Date: 2026/11/16 23:00', 'From: KE7KDQ', 'Mbo: KE7KDQ', 'Subject: x', 'To: someone@example.com', 'To: N0CALL', 'Type: Private'] }), 'x.b2f');
    expect(errors(r)).toEqual([]);
    expect(warnings(r)).toEqual([
      'Internet address "someone@example.com" has no SMTP: prefix',
      'Body is labelled ISO-8859-1 but looks like UTF-8',
      'Bare LF in the body on body line 1',
    ]);
  });
});

describe('Winlink Express export', () => {
  it('passes a clean export and checks the MIME attachments', () => {
    const r = check(utf8(weExport()), 'Exported_Messages.xml');
    expect(r.kind).toBe('winlink-export');
    expect(r.form).toBe('ICS-213');
    expect(r.issues).toEqual([]);
  });
  it('errors on a missing closing boundary and bad base64', () => {
    expect(errors(check(utf8(weExport({ close: false })))) ).toEqual(['No closing boundary --BND--']);
    const parts = '--BND\r\nContent-Disposition: attachment; filename="a.jpg"\r\nContent-Transfer-Encoding: base64\r\n\r\n@@@@\r\n';
    expect(errors(check(utf8(weExport({ parts }))))).toEqual(['Part "a.jpg" is not valid base64']);
  });
  it('checks the viewer XML inside the export', () => {
    const bad = viewerXml({ params: { display_form: null } });
    const parts = `--BND\r\nContent-Disposition: attachment; filename="${VIEWER}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(utf8(bad))}\r\n`;
    const r = check(utf8(weExport({ parts })), 'e.xml');
    expect(r.issues.map((i) => [i.level, i.file, i.message])).toEqual([
      ['error', `e.xml > message ABC123DEF456 > ${VIEWER}`, 'Missing display_form: the receiver cannot pick a viewer'],
    ]);
  });
  it('errors on a bad message id and warns when Message-ID differs', () => {
    expect(errors(check(utf8(weExport({ id: 'TOOLONGMESSAGEID' })))) ).toEqual(['<id> "TOOLONGMESSAGEID" is not a 1 to 12 character message ID']);
    const text = weExport().replace('Message-ID: ABC123DEF456', 'Message-ID: OTHER');
    expect(warnings(check(utf8(text)))).toEqual(['Message-ID "OTHER" differs from <id> "ABC123DEF456"']);
  });
});

describe('detectKind', () => {
  it('detects by content, then by name', () => {
    expect(detectKind(utf8('  {"a":"b"}'))).toBe('save-data');
    expect(detectKind(utf8(viewerXml()))).toBe('viewer-xml');
    expect(detectKind(utf8(weExport()))).toBe('winlink-export');
    expect(detectKind(b2f())).toBe('b2f');
    expect(detectKind(latin1(FORMDATA))).toBe('form-data-txt');
    expect(detectKind(utf8('x'), 'dir/FormData.txt')).toBe('form-data-txt');
    expect(detectKind(utf8('hello'))).toBe('unknown');
  });
  it('reports an unknown file as an error', () => {
    expect(errors(check(utf8('hello'), 'a.txt'))).toEqual(['Not a file type this checker knows']);
  });
});
