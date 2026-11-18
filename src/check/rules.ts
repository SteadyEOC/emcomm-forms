// Central registry of every checker rule. Ids are `<area>/<kebab-name>` and stay stable
// (people put them in config files and CI). `level` is the default (the standard profile).
// `fatal` marks "the file cannot be read at all".

export type RuleLevel = 'error' | 'warning' | 'info';

export interface RuleInfo {
  level: RuleLevel;
  description: string;
  /** The file cannot be read at all (not well-formed, bad JSON, unreadable layout, unknown type). */
  fatal?: true;
}

const e = (description: string, fatal?: true): RuleInfo => (fatal ? { level: 'error', description, fatal } : { level: 'error', description });
const w = (description: string): RuleInfo => ({ level: 'warning', description });

export const RULES: Record<string, RuleInfo> = {
  // XML
  'xml/not-well-formed': e('The XML is not well-formed, so no reader can parse it.', true),
  'xml/unescaped-amp': e("A literal '&' is not escaped as &amp; (the classic bug).", true),
  'xml/invalid-utf8': e('Bytes are not valid UTF-8 for a file that declares no other encoding.'),
  'xml/invalid-utf8-lenient': w('Bytes are not valid UTF-8 (a warning where the writer is known to be sloppy).'),
  'xml/encoding-declared': w('The XML declares an encoding other than UTF-8.'),
  'xml/doctype': w('The XML has a DOCTYPE, which these files never need.'),

  // Viewer XML (RMS_Express_Form_*.xml)
  'viewer/wrong-root': e('The root element is not <RMS_Express_Form>.', true),
  'viewer/missing-element': e('A required top-level element is missing.'),
  'viewer/duplicate-element': e('A top-level element appears more than once.'),
  'viewer/nested-element': e('An element that must hold only text holds elements.'),
  'viewer/duplicate-parameter': e('A form parameter appears twice.'),
  'viewer/missing-display-form': e('display_form is missing, so the receiver cannot pick a viewer.'),
  'viewer/file-name': e('The file is not named RMS_Express_Form_*.xml, so clients will not treat it as a form.'),
  'viewer/duplicate-variable': e('A variable appears twice; readers may take either value.'),
  'viewer/no-declaration': w('No XML declaration.'),
  'viewer/unexpected-element': w('An unexpected top-level element.'),
  'viewer/element-order': w('<variables> comes before <form_parameters>.'),
  'viewer/unexpected-attributes': w('An element has attributes; none are expected.'),
  'viewer/unknown-parameter': w('An unknown form parameter.'),
  'viewer/parameter-order': w('Form parameters are not in the usual order.'),
  'viewer/display-form-extension': w('display_form does not end in .html.'),
  'viewer/missing-parameter': w('A usual form parameter is missing.'),
  'viewer/xml-version': w('xml_file_version is not 1.0 (the only version seen).'),
  'viewer/datetime-format': w('submission_datetime is not yyyyMMddHHmmss (UTC).'),
  'viewer/grid-format': w('grid_square is not a Maidenhead locator.'),
  'viewer/file-name-mismatch': w('The file name does not match display_form.'),
  'viewer/variable-case': w('A variable name is not lower-case.'),
  'viewer/missing-client-variable': w('A variable every client writes is missing.'),
  'viewer/missing-variable': w('A variable of the recognised form is missing.'),
  'viewer/unknown-variable': w('A variable is not in the recognised form field list.'),
  'viewer/unverified-template': w('The template version has not been checked against a real sample.'),

  // FormData.txt
  'formdata/non-ascii': w('FormData.txt holds non-ASCII bytes (untested with WE and Pat).'),
  'formdata/bare-lf': w('FormData.txt lines end in bare LF; WE and Pat write CRLF.'),
  'formdata/blank-line': w('A blank line inside FormData.txt.'),
  'formdata/bad-line': w('A line is not "Label:T=value" or "Label:M=value".'),
  'formdata/no-mapfilename': w('The first line is not MapFileName:T=...'),

  // Save Data (JSON)
  'savedata/invalid-utf8': e('The file is not valid UTF-8.'),
  'savedata/invalid-json': e('The file is not valid JSON; Load Data cannot read it.', true),
  'savedata/not-object': e('The JSON is not one flat object.', true),
  'savedata/nested-value': e('A field holds an array or object instead of a string.'),
  'savedata/bom': w('The file starts with a UTF-8 byte order mark.'),
  'savedata/duplicate-key': w('A key appears twice; Load Data keeps the last.'),
  'savedata/null-value': w('A field is null; write "" for an empty field.'),
  'savedata/no-templateversion': w('No "Templateversion" key.'),
  'savedata/missing-field': w('A field of the recognised form is missing.'),
  'savedata/unknown-field': w('A key is not a field of the recognised form (or has the wrong case).'),
  'savedata/unverified-template': w('The template version has not been checked against a real sample.'),

  // Pat B2F
  'b2f/no-header-end': e('No blank line after the headers.', true),
  'b2f/missing-body-header': e('No Body header: the body length is unknown.', true),
  'b2f/bad-count': e('A Body or File count is not in the expected shape.', true),
  'b2f/truncated': e('A Body or File count runs past the end of the file.', true),
  'b2f/missing-crlf': e('No CRLF before an attachment: counts are wrong.', true),
  'b2f/bad-header-line': e('A header line has no "Name:".'),
  'b2f/duplicate-header': e('A header that must appear once appears more than once.'),
  'b2f/missing-header': e('A required header (Mid, Date, From, To) is missing.'),
  'b2f/invalid-mid': e('Mid is not 1 to 12 characters.'),
  'b2f/extra-bytes': e('Several bytes follow the last part: a count is too small.'),
  'b2f/invalid-utf8': e('The body is labelled UTF-8 but is not.'),
  'b2f/address-smtp-format': w('An SMTP: address is not SMTP:user@host.'),
  'b2f/address-no-smtp-prefix': w('An Internet address has no SMTP: prefix.'),
  'b2f/address-unrecognised': w('An address is not a call sign, tactical address or SMTP:user@host.'),
  'b2f/bare-lf-headers': w('Header lines end in bare LF; Pat writes CRLF.'),
  'b2f/raw-non-ascii-header': w('A header holds raw non-ASCII bytes; Pat encodes them as RFC 2047 encoded words.'),
  'b2f/unknown-header': w('An unknown header.'),
  'b2f/mid-characters': w('Mid has characters other than A-Z and 0-9.'),
  'b2f/date-format': w('Date is not "YYYY/MM/DD HH:MM" (UTC).'),
  'b2f/missing-recommended-header': w('Subject, Mbo or Type is missing.'),
  'b2f/unusual-type': w('An unusual Type header.'),
  'b2f/no-charset': w('Content-Type names no charset.'),
  'b2f/no-final-crlf': w('No CRLF after the last attachment.'),
  'b2f/trailing-bytes': w('One or two stray bytes follow the last part.'),
  'b2f/charset-mismatch': w('The body is labelled ISO-8859-1 but looks like UTF-8.'),
  'b2f/undeclared-non-ascii': w('The body holds non-ASCII bytes but no charset says how to read them.'),
  'b2f/unusual-charset': w('An unusual charset.'),
  'b2f/bare-lf-body': w('Bare LF in the body; Pat writes CRLF.'),

  // MIME (inside a Winlink Express export)
  'mime/no-header-end': e('MIME text has no blank line after its headers.'),
  'mime/header-missing': e('A required MIME header is missing.'),
  'mime/no-recipient': e('No To or Cc header.'),
  'mime/no-boundary': e('A multipart Content-Type has no boundary.'),
  'mime/part-no-header-end': e('A MIME part has no blank line after its headers.'),
  'mime/bad-base64': e('A part is not valid base64.'),
  'mime/bad-quoted-printable': e('A part is not valid quoted-printable.'),
  'mime/no-closing-boundary': e('No closing boundary: the message is cut short.'),
  'mime/header-recommended': w('A usual MIME header is missing.'),
  'mime/message-id-mismatch': w('Message-ID differs from <id>.'),
  'mime/qp-line-length': w('A quoted-printable line is longer than 76 characters.'),
  'mime/unknown-transfer-encoding': w('An unknown Content-Transfer-Encoding.'),

  // Winlink Express export
  'export/wrong-root': e('The root element is not <Winlink_Express_message_export>.', true),
  'export/no-message-list': e('No <message_list>.', true),
  'export/missing-id': e('A message has no <id>.'),
  'export/invalid-id': e('A message <id> is not a 1 to 12 character message ID.'),
  'export/missing-mime': e('A message has no <mime>.'),
  'export/no-parameters': w('No <export_parameters>.'),
  'export/xml-version': w('xml_file_version is not 1.0 (the only version seen).'),
  'export/empty': w('The export holds no messages.'),

  // Whole file
  'file/unknown-kind': e('Not a file type this checker knows.', true),
  'file/multiple-viewers': w('Several viewer XML attachments; a reader shows only one.'),
  'file/form-data-mismatch': w('FormData.txt is for a different form than the viewer XML.'),
};

export function listRules(): { id: string; level: RuleLevel; description: string; fatal: boolean }[] {
  return Object.entries(RULES).map(([id, r]) => ({ id, level: r.level, description: r.description, fatal: r.fatal === true }));
}
