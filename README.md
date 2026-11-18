# emcomm-forms

Build and strictly check the files that carry emergency-communications forms (ICS-213, ICS-213RR,
ICS-214, ICS-205, HICS-251, the 309 communications log and more) to amateur-radio messaging programs:

- **Winlink form "Save Data" files**: the operator opens the form in Winlink Express (or Pat), clicks
  **Load Data**, checks it and submits, and the program builds the form message itself
- **Pat** outbox messages (`.b2f`)
- **FLMSG** form files (`.213`, `.309`, `.p2s`, `.c2s`) and the `[WRAP]` envelope, for sending with FLDIGI
- **plain text** for any client's compose window

plus a **strict checker** for those files and for what Winlink Express and Pat write, so a tool can
check a message before it goes out by radio.

It makes files; it never sends them. No radio, modem, gateway or Winlink server connections, and it never
writes into another program's data folders. Zero runtime dependencies; no DOM and no Node APIs in the
library, so it runs in browsers and in Node 22+.

**Status: 0.1, early.** Every writer is tested byte for byte against files the real program saved, except
the FLMSG writer (see below). Please try it on drills and tell us what breaks.

## Install

```sh
npm install emcomm-forms
```

ES modules only: `import { ... } from 'emcomm-forms'`. TypeScript types included.

## Winlink form Save Data (Load Data)

```js
import { writeSaveData, encodeUtf8 } from 'emcomm-forms';

const text = writeSaveData('ICS-213', {
  inc_name: 'Exercise Cascade Quake',
  to_name: 'Logistics Section Chief',
  fm_name: 'Shelter Manager, North Shelter',
  Subjectline: 'Cots and water needed',
  Mdate: '2026-11-17',
  Mtime: '11:15',
  Message: 'Please send 20 cots and 200 litres of water.',
  Approved_Name: 'Pat Example',
  Approved_PosTitle: 'Shelter Manager',
});
// Save encodeUtf8(text) as e.g. "ICS-213 drill.txt"; the operator loads it with the form's Load Data button.
```

Forms: `ICS-213`, `ICS-213RR`, `ICS-214`, `ICS-205`, `HICS-251`, `Hospital Status`, `Field Situation`
(`SAVE_DATA_FORMS`), for the templates in Winlink Standard Forms 1.1.22.0. Keys are the template's own
field names, case-sensitive; `saveDataFields(formId)` lists them in order, with their type and the ones
the form fills in by itself (`Templateversion`, `FormData` and so on, which the writer sets). An unknown
or misspelt key throws, because the form's Load Data would not fill it in. Fields left out are written
empty. The output matches 13 real saves from Winlink Express 1.8.6 and Pat 1.0.1 byte for byte.

## Plain text and Pat

```js
import { writePlainText, writeB2f } from 'emcomm-forms';

const { text, folded } = writePlainText({
  title: 'GENERAL MESSAGE (ICS 213)',
  fields: [{ label: '1. Incident Name', value: 'Exercise Cascade Quake' }, { label: '7. Message', value: 'Please send 20 cots.' }],
});
// Wrapped at 72 columns, CRLF, folded to US-ASCII by default (charset 'iso-8859-1' or 'utf-8' to keep more).

const b2f = writeB2f({ date: new Date(), from: 'N0CALL', mbo: 'N0CALL', to: ['N0CALL'], subject: 'ICS-213', body: text,
  randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)) });
// A Pat outbox message, byte for byte as Pat 1.0.1 writes one.
```

`writePlainText` is a neutral `Label: value` layout, not a copy of a form's own message text.

## FLMSG

```js
import { writeFlmsg, wrapFlmsg } from 'emcomm-forms';

const file = writeFlmsg({ form: 'ics213', fields: { inc: 'Drill', to: 'Logistics', fm: 'Shelter', sb: 'Cots', mg: 'Send 20 cots.' } });
// Save as drill.213. Forms: ics213 (.213), ics309 (.309, up to 34 rows), plaintext (.p2s), csvform (.c2s).
const overTheAir = wrapFlmsg('drill.213', file); // [WRAP:beg]...[WRAP:chksum XXXX][WRAP:end]
```

**Untested against a real FLMSG save.** The layout was learned by reading FLMSG 4.0.20's source; line
endings on Windows, header and field order still need a file FLMSG itself saved. If FLMSG opens one of
these wrongly, please open an issue with the file (made-up data).

## Checker

```text
npx emcomm-forms check [--profile strict|standard|lenient|emergency] [--rule <id|area/*>=off|info|warn|error]
                       [--max-warnings N] [--format text|json|sarif] <file>...
npx emcomm-forms rules
```

It reads Winlink form Save Data files, `RMS_Express_Form_*.xml`, `FormData.txt`, Pat `.b2f` files and
Winlink Express exports, and checks the form files inside a message too. It knows the field lists of the
seven forms above. An **error** means a reader would break or misread the file (an unescaped `&`, a
`Body:` count in characters instead of bytes, a missing `display_form`); a **warning** means it differs
from what Winlink Express or Pat write. From code: `check(bytes, name, options)` returns
`{ kind, form, issues, errors, warnings, infos, ok, profile }`. Every issue has a stable rule id
(`b2f/body-count` style). Profiles follow ESLint conventions: `strict` for tests and CI, `standard`
(default), `lenient`, and `emergency`, which lets everything through but still reports and logs every
issue. Pass a `logger` to receive each issue; `toSarif()` writes SARIF 2.1.0.

More in [`examples/`](examples/) (run them with `npm run examples` in a clone).

## Not yet

Winlink Express import files and form viewer XML (writing them), the 309 communications log as a Winlink form, a
checker layer for FLMSG files, and a form's own message text. Long view: `VISION.md`; next steps:
`ROADMAP.md`; the standards each part is checked against: `docs/standards-and-references.md`.

## Thanks

To the operators who have given samples, advice and comments: see `ACKNOWLEDGMENTS.md`. Saved form files
with made-up data, and notes on where a file from this library broke in your program, are the most
useful help. How to contribute, and the project's rules: `CONTRIBUTING.md`.

## Licence

MIT. See `LICENSE`. Part of the SteadyEOC family; used by [RangerTrak](https://rangertrak.org).
"Winlink" is a trademark of the Amateur Radio Safety Foundation, Inc.; this project is not affiliated with it.
Winlink's form templates are not included; only field names learned from saved files.
