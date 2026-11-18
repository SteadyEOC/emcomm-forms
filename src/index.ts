/**
 * emcomm-forms: writers and a strict checker for emcomm form messages.
 *
 * Format writers arrive phase by phase, each golden-tested against real exports
 * (see ROADMAP.md). For now this exports spec-defined helpers (RFCs and plain maths).
 */
export { VERSION } from './version.js';

export { asciiFold } from './text/ascii-fold.js';
export { normaliseLineEndings, wrapText } from './text/layout.js';
export type { WrapOptions } from './text/layout.js';
export { encodeUtf8, encodeLatin1, encodeAscii, byteLength } from './encoding/bytes.js';
export type { Charset, EncodeOptions } from './encoding/bytes.js';
export { encodeQuotedPrintable, decodeQuotedPrintable } from './encoding/quoted-printable.js';
export type { QuotedPrintableOptions } from './encoding/quoted-printable.js';
export { formatRfc5322Date, formatB2fDate, formatCompactUtc } from './date/format.js';
export { escapeXmlText, escapeXmlAttr, isXmlChar } from './xml/escape.js';
export { maidenhead } from './geo/maidenhead.js';
export { generateMid, isValidMid, MID_LENGTH } from './mid/mid.js';
export type { Issue, IssueLevel } from './check/issue.js';
export { check, detectKind, formatIssue } from './check/check.js';
export { toSarif } from './check/sarif.js';
export { RULES, listRules } from './check/rules.js';
export type { RuleInfo, RuleLevel } from './check/rules.js';
export type { CheckOptions, Profile, RuleSetting } from './check/config.js';
export { PROFILES } from './check/config.js';
export type { Logger } from './log.js';
export { noopLogger } from './log.js';
export type { CheckResult, FileKind } from './check/check.js';
export { parseXml } from './check/xml-parse.js';
export type { XmlDocument, XmlElement } from './check/xml-parse.js';
export { createSink } from './check/issue.js';
export type { Sink } from './check/issue.js';
export { FORMS, formByTemplateVersion, templateStem } from './check/forms.js';
export type { FormSpec } from './check/forms.js';
export { writeB2f } from './write/b2f.js';
export type { B2fMessage, B2fAttachment } from './write/b2f.js';
export { writeSaveData, saveDataFields, saveDataTemplateVersion, SAVE_DATA_FORMS } from './write/save-data.js';
export type { SaveDataValue, SaveDataField } from './write/save-data.js';
export { writePlainText } from './write/plain-text.js';
export type { PlainTextMessage, PlainTextField, PlainTextOptions, PlainTextResult } from './write/plain-text.js';
export { writeFlmsg, wrapFlmsg, crc16Modbus, flmsgExtension, formatFlmsgHeaderDate, FLMSG_FORMS } from './write/flmsg.js';
export type { FlmsgForm, FlmsgFile, FlmsgStation } from './write/flmsg.js';
