# Changelog

All notable changes. Versions follow semantic versioning; before 1.0, a minor version may break the API.

## 0.1.3 (2026-11-18)

- `writeFlmsg`: plaintext (`.p2s`) and CSV form (`.c2s`) now match files saved by FLMSG 4.0.24 on
  Windows byte for byte. Plaintext fields now come in FLMSG's real order, `tt to fm dt tm sb mg` (the
  subject was before the date). FLMSG reads fields in any order, so older files still load.
- `wrapFlmsg`: matches a real File > Wrap > Export byte for byte, checksum included. No change was needed.
- Every FLMSG form this package writes is now golden-tested against real saves.

## 0.1.2 (2026-11-18)

- `writeFlmsg`: ICS-213 now matches files saved by FLMSG 4.0.24 on Windows byte for byte (two golden
  tests; the 309 log matched with no change). Fields come in FLMSG's real order (`inc to p1 fm p2 d1 t1 sb s1 p3 s2 p4 d2 t2 mg rp`), line
  ends are CRLF by default (field lengths still count a line break as one byte), and the first line says
  `4.0.24`. New option `lineEnd: 'lf'` for FLMSG on Linux or macOS. FLMSG reads fields in any order, so
  files from 0.1.x still load.

## 0.1.1 (2026-11-18)

- Package description spells out emergency communications and lists the formats and forms; more
  search keywords. No code changes.

## 0.1.0 (2026-11-18)

First release.

- `writeSaveData(formId, values)`: Winlink form "Save Data" files for Load Data in Winlink Express and
  Pat. ICS-213, ICS-213RR, ICS-214, ICS-205, HICS-251, Hospital Status, Field Situation (Standard Forms
  1.1.22.0). Byte for byte against 13 real saves. Also `saveDataFields`, `saveDataTemplateVersion`,
  `SAVE_DATA_FORMS`.
- `writePlainText(message, options)`: title, labelled fields and text, 72 columns, CRLF, folded to
  US-ASCII, ISO-8859-1 or kept as UTF-8.
- `writeB2f(message)`: Pat outbox messages, byte for byte against six Pat 1.0.1 messages.
- `writeFlmsg(file)`, `wrapFlmsg(name, text)`, `crc16Modbus`: FLMSG `.213`, `.309`, `.p2s`, `.c2s` and the
  `[WRAP]` envelope. **Untested against a real FLMSG save.**
- `check(bytes, name, options)` and the `emcomm-forms` CLI: strict checker for Save Data, viewer XML,
  `FormData.txt`, Pat `.b2f` and Winlink Express exports; profiles, rule overrides, SARIF.
- Helpers: `asciiFold`, `wrapText`, `encodeUtf8/Latin1/Ascii`, quoted-printable, RFC 5322 and B2F dates,
  XML escaping, Maidenhead grid, message ids.
