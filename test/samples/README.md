# Sample files (the spec)

Real files saved by the real programs. Writers are golden-tested against these byte for byte, after
normalising message IDs, dates and program-version strings.

**Rules:** test data only, no real incident data, no real people's details beyond the tester's own call
sign. This folder will be public. Winlink's form **templates** never go here; put them in the git-ignored
`samples-local/` at the repo root.

For each file, add a line below: file name, program and version, how it was made, date.

## Wanted (phase 0)

- **Winlink Express "Save Data" files** (open the form from a new message, fill it, click Save Data at the
  top): ICS-213, ICS-213RR, ICS-309 with 3 rows and with more rows than a page, ICS-214; one 213 with
  awkward text (`R&R`, `<`, `=41`, an accented name, a long message, line breaks). Note the template
  version shown on the form. Then hand-edit copies (a key removed, an unknown key added) and note what
  Load Data does with each; try one in Pat's form page. For each, also export the message WE builds
  after Load Data + Submit, so the pair (input, output) is kept together.
- ✅ 2026-11-17 (`docs/winlink-express-1.8.6.md`: a `file:///` copy in `<CALL>\Temp\`, posting to localhost:8001).
  **How WE opens a form**: when the form opens, note the browser's address bar. Is it a
  `http://localhost:<port>/...` address or a `file:///` path? Which browser opens? Does the address
  change per message? A screenshot of the address bar is enough. Winlink's forms guide says Submit posts
  to WE's own form server (default port 8001); also note the port in Settings > Forms Setup.
- **Winlink Express** (Message > Export): one plain message; one each of ICS-213, ICS-213RR, 309 with
  3 rows, 309 with more rows than the form holds, ICS-214. Also each message's
  `RMS_Express_Form_*_Viewer.xml` and `FormData.txt` attachments. (WE names the 309 template
  `Form-309 Communications Log`, under Standard Forms > ICS USA Forms, without "ICS".) Also run
  **Message > Generate Form 309 Communications Log** over a range covering a few test messages: it makes a
  PDF and a CSV report, not a message (help file, 11-17), so keep the CSV and the PDF.
- **Message > Import form xml file** with a viewer XML + `FormData.txt` taken from an exported 213: does
  the new Inbox message render the form? (The oracle for our phase 2 viewer XML.)
- **Import messages** of an export holding an Outbox message, on a copy of WE's data only: it would queue
  the message to send. Lower priority; tells the 0.2 import-file writer which folder to target.
- **Pat** (web GUI, then copy from its `out/` folder before connecting): one plain message, one ICS-213 (`.b2f`).
  ✅ 2026-11-17: both done (see Index). 213RR, 214, 205, HICS-251, Hospital Status, Field Situation done 11-17. Still wanted from Pat: 309 Save Data + `.b2f`; a 213
  with awkward text; Load Data of a hand-edited Save Data file.
- **FLMSG**: ✅ ICS-213 done 2026-11-18 (see `flmsg/`). Still wanted: ICS-214, ICS-309, plaintext, CSV-text with 3 rows, CSV-text with commas and quotes inside a
  cell, radiogram; the wrapped text FLMSG hands FLDIGI for one of them; and what a second FLDIGI/FLMSG
  receives (loopback or a second PC).
- A note of each program's version.

## Index

### Winlink Express 1.8.6.0, Standard Forms 1.1.22.0 (ICS 213 v.43.8), made 2026-11-17

Made-up content. Position is the centre of grid CN87SK (WE's
default when there's no GPS). Facts in `docs/winlink-express-1.8.6.md`.

| File | What it shows |
|---|---|
| `we/we-1.8.6.0-ics213-v43.8-savedata.txt` | **Save ICS213 INITIAL Data** from the form WE opened (renamed from `ICS-213 data 2026-11-17 17_32.txt`, bytes unchanged). Same 44 keys, order and layout as Pat's Save Data; `theMsgSender` = `KE7KDQ` (Pat leaves `{var MsgSender}`). Subject cut at the field's 50-character limit while typing. Passes `check` with no issues (`test/we-samples.test.ts`). |

### Pat 1.0.1 (official Windows zip, sha256 79b4319d...4cd0d), made by Claude 2026-11-16

`pat compose` with a throwaway config and mailbox in the repo's `.tmp\`, call sign KE7KDQ, made-up text,
example.com and tactical addresses; nothing connected. Each file is Pat's outbox file, unchanged.

| File | What it shows |
|---|---|
| `pat/pat-1.0.1-plain.b2f` | Plain two-line message to `SMTP:someone@example.com`. Header order: `Mid`, `Body`, then alphabetical. No attachments: the file ends right after the body (no extra CRLF). |
| `pat/pat-1.0.1-accented.b2f` | `José Ñúñez`, `café`, `21°C`, `R&R <ok> =41`. Body is ISO-8859-1 (1 byte per accented letter; `Body:` counts bytes). Subject non-ASCII is an RFC 2047 encoded word: `=?ISO-8859-1?q?Accented_test_=E9?=`. |
| `pat/pat-1.0.1-long-line.b2f` | One 400-character line: Pat does not wrap. |
| `pat/pat-1.0.1-several-recipients-cc.b2f` | Three `To:` (call sign, tactical, SMTP) and two `Cc:` lines, in the order given. |
| `pat/pat-1.0.1-attachments-csv-png.b2f` | A CSV and a PNG. **Pat converted the 7,831-byte PNG into an 808-byte `dot.jpg`** (name and type changed) on compose. Ends with CRLF after the last file. |
| `pat/pat-1.0.1-tactical-p2p.b2f` | `--from EOC-TEST --p2p-only`: `From: EOC-TEST`, `Mbo: KE7KDQ`, and an `X-P2ponly: true` header. |

Pat also wrote `template-sequence-number.json` into `%LOCALAPPDATA%\pat\` despite every path flag; next
time set `LOCALAPPDATA` inside the run folder too.

### Pat 1.0.1 ICS-213 form, Winlink Standard Forms 1.1.22.0 (ICS 213 v.43.8), made by Claude 2026-11-17

An installed Pat (`pat templates update` fetched the forms into its Pat folder; templates are not in
the repo). `pat http` ran with a throwaway config (no password) and mailbox in `.tmp\`, `LOCALAPPDATA`
pointed there too; the form was filled in Chrome (isolated context) with made-up data and a public
landmark position (Space Needle). Nothing connected. Both files pass `emcomm-forms check` with no issues.

| File | What it shows |
|---|---|
| `pat/pat-1.0.1-ics213-v43.8-savedata.txt` | The form's **Save ICS213 INITIAL Data** output, captured from the page's Blob (bytes exactly as the browser would download them; default name `ICS-213 data 2026-11-17 11_03.txt`). Flat JSON, 2-space indent, LF, no final newline (same layout as Bob's WE file). Message newlines are `\n`. `FormData` key holds the template's `FormData.txt` pattern, not values. `testCall` = the Pat call sign. **First public Save Data sample (phase 1a).** |
| `pat/pat-1.0.1-ics213-v43.8.b2f` | The same form after Submit + Post, to KE7KDQ. Attachments `FormData.txt` (740) and `RMS_Express_Form_ICS213_Initial_Viewer.xml` (2735); ends with CRLF. Subject `ICS-213: <subject> - <date> <time>`. Viewer XML `rms_express_version` = `Pat v1.0.1 (2ad31e8)`, message newlines as `&#xD;&#xA;`. Pat leaves `{var MsgSender}` unsubstituted in the body's `[Sender: ...]` line (a Pat quirk, not ours). |

### Pat 1.0.1, six more forms, Winlink Standard Forms 1.1.22.0, made by Claude 2026-11-17

Same recipe as the ICS-213 above (throwaway `pat http` on port 8099, isolated Chrome context, form
opened from the composer's Template picker, Save Data captured from the page Blob, then Submit + Post
to KE7KDQ). Made-up names and numbers; positions are the Space Needle (47.6205, -122.3493; address
400 Broad St). Every file passes `emcomm-forms check` with no issues (`test/pat-samples.test.ts`).

| Files (`pat/pat-1.0.1-…`) | Template | What it shows |
|---|---|---|
| `ics213rr-v14.6-savedata.txt`, `.b2f` | `ICS 213RR v. 14.6` | Two order rows. **No `parseme` key**: the template's save code skips it since a 2026-09-25 edit (comment in the template), version string unchanged; Kevin's WE save from 2025-12 has it. Viewer XML only, **no FormData.txt**. |
| `ics214-v17.10-savedata.txt`, `.b2f` | `ICS 214 v 17.10` | Three people, three activity rows (one with `& <test>`). Keeps `parseme2`. No FormData.txt. |
| `ics205-v19.5-savedata.txt`, `.b2f` | `ICS205- v 19.5` | Two channel rows, a two-line instruction. "Date/Time Prepared" (`ActivityDateTime2`) is `required`: Submit does nothing until it is filled. No FormData.txt. |
| `hics251-v.6-savedata.txt`, `.b2f` | `HICS-251 v .6` | Select boxes; the template copies each choice into a hidden `DMa`…`DMg`. FormData.txt has a whitespace-only line. |
| `hospital-status-2.3-savedata.txt`, `.b2f` | `General Hospital Status 2.3` | Exercise checkbox saved as the number `1`. **Newer than Kevin's 2.2**: adds `StreetADDRESS`, `City`, `State`, `ZipCode`, `locationSource`, `location_source`, `BtnAttachXML`, `AttachXML`. FormData.txt has `Label: T=` (space before the type) and a bare `Status:M:` heading. Subject is the fixed `HOSPITAL STATUS REPORT`. |
| `field-situation-0.2.10-savedata.txt`, `.b2f` | `Field Situation Report V 0.2.10` | **Newer than Kevin's 0.1.5**: `Land` became `POTS` + `VOIP`, plus `Celltext`, `TVStatusb/c`, `PowerStable`, `NatGas`, `NOAAb` and their comment boxes. The form's own `MsgTo` field fills the composer's To; subject `//WL2K R/ Routine/ Field Situation Report`. |

All six viewer XMLs list variables in alphabetical order and include `parseme` (the field is posted
even when Save Data leaves it out). Pat wrote `template-sequence-number.json` into the real
`%LOCALAPPDATA%\pat\` again, even with `LOCALAPPDATA` pointed into the run folder.

### FLMSG 4.0.24 (Windows installer from w1hkj.org), made by John 2026-11-18

Made-up data; KE7KDQ is John's own call. Saved with File > Save As, files kept byte for byte.

| File | What it shows |
|---|---|
| `flmsg/ics213-4.0.24-windows.213` | ICS-213, Originator tab only. CRLF line ends, but each length counts a line break as one byte; UTF-8 (`Café` = 5 bytes); `:hdr_ed:` only; field order `inc to p1 fm p2 d1 t1 sb s1 p3 mg`; empty fields left out; `!@#$%&*()_+":?><` stored as-is. |
| `flmsg/ics213-reply-4.0.24-windows.213` | Same 213 with the Responder tab filled (saved as `.213.txt`). Adds `:hdr_fm:` (time of a Send) before `:hdr_ed:`; reply fields go `s2 p4 d2 t2` before `mg`, and `rp` comes last. |
| `flmsg/ics309-4.0.24-windows.309` | ICS-309, 3 log rows. Header fields `inc dfm tfm dto tto pre dtm net opr`, then each row as `tm[n] to[n] fm[n] msg[n]` with n from 0. Our writer matched it with no change. |
