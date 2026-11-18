# Winlink Express 1.8.6.0: what's installed and what the UI offers

Facts recorded 2026-11-17 from a desktop install (screenshots, the install folder, the
logs, and the program's own help file `RMS Express.chm`, read in a scratch folder). The help text is
summarised here in our own words; nothing is copied, and no template files are kept (CONTRIBUTING.md rule 2).

## Install

- winget `Winlink.WinlinkExpress` 1.8.6.0, installed **per user** on 2026-11-17 in
  `%LOCALAPPDATA%\Programs\RMS Express\`. Executable `RMS Express.exe` (dated 2026-09-28);
  the help file says "RMS Express" throughout. Also `ARDOP_Win.exe`, `RMS Link Test.exe`,
  `RMS Simple Terminal.exe`. .NET Framework WinForms, using Newtonsoft.Json, SQLite, GMap.NET and
  NReco.PdfGenerator.
- An empty older install from 2022 sits in `C:\Program Files (x86)\RMS Express\` (no exe). Ignore it.
- **The data lives inside the install folder**, not in AppData:
  - `<CALL>\` (here `KE7KDQ\`): `Data\` (`Registry.txt`, `Mids Seen.txt`), `FormData\`, `Logs\`,
    `Messages\`, `MessagesBackup\`, `Partials\`, `Templates\`.
  - `Global Folders\`: the folders shared by all call signs on the install.
  - `Standard Templates\`: Winlink's forms, unpacked on first run from `Standard_Forms.zip`, then
    auto-updated from `autoupdate2.winlink.org`. **Standard Forms 1.1.22.0** (`Standard_Forms_Version.dat`),
    the same version Pat fetched. 419 files in 25 family folders (ARC, CA, Canadian, FEMA, FMRE, General,
    General Medical, HI, HICS, IARU, ICS USA, LA, Mapping-GIS, NY & NJ, OR, Philippines, Radiogram & RRI,
    SC, SHARES, Specialized, TX, USGS, WA, Weather) plus `Changelog.txt`.
  - Log file names and timestamps are **UTC** (a 16:23 local first run logs as `20261118 00:23`).
- ICS USA Forms file names, as in Pat: `ICS213_Initial.html`, `ICS213_Initial_Viewer.html`,
  `ICS213_SendReply*.html`, `ICS213 General Message.txt`, `ICS213RR_*`, `ICS214_*`, `ICS214A_*`,
  `Form-309_Initial.html`, `Form-309_Viewer.html`, `Form-309 Communications Log.txt`, and 201-217A.
  Each form has a `.txt` (the template WE lists), an initial `.html` and a viewer `.html`; reply forms
  add a `.0` file.

## First run

- WE asks for a call sign, password, password-recovery email, grid square, an optional **WE
  registration key**, and registration contact details (name, address, phone). Done here as KE7KDQ.
  The same dialog is "Add Callsign", which adds more call signs, plus auxiliary call signs and tactical
  addresses.
- Service code `PUBLIC` for hams.

## Main window

Title `Winlink Express 1.8.6.0 - <CALL>`. Across the top: the call-sign picker, **Add Callsign**,
**Settings**, **Message**, **Attachments**, **Move To:** (Inbox, Read Items, Outbox, Sent Items, Saved Items,
Deleted Items, Drafts), **Delete**, **Open Session:** and **Help**.

Toolbar, left to right: new message; reply, reply all and acknowledge; forward and forward without
change; search; **Position report**; **Form Map and CSV File** (globe); **Show map of message origin
location**; **Catalog request**; **GRIB file request**; save; print; **Open session**; help.

Left pane: System Folders (as in Move To), Personal Folders, Global Folders, Contacts. Message list
columns: Date/Time, Message ID, Size, Source, Sender, Recipient, Subject.

**Open Session** sessions are grouped as Winlink Sessions (Telnet, Packet, Pactor, Robust Packet, Ardop,
Vara HF, Vara FM, Iridium GO), P2P Sessions, Radio-Only Sessions, RMS Post Office Sessions and Network
Post Office Sessions. None of these are used for samples (rule 4): build messages, leave them in the
Outbox, and export them.

**Settings menu:** Winlink Express Setup; fonts and colour themes; GPS / Position Reports; Winlink Catalog
Requests; GRIB file request; Preferences; Message Notification and Forwarding; CMS Forwarding and User
Options; **Form settings**; Auto session open on startup; Contacts; Group Addresses; Add Personal or Global
Folder; Hybrid Network Parameters; Propagation calculation parameters; View Usage Statistics; View
background tasks; Backup and restore databases; Exit.

**Message menu:** New Message; Reply, Reply to All, Forward; Forward without change; Acknowledge receipt;
Save message as; Edit; **Template and forms manager**; Template and forms settings; Set favorite
templates and forms; **HTML Forms**; **Import form xml file**; **Generate Form 309 Communications Log**;
**Generate maps and CSV files for forms**; **Export selected messages**; **Import messages**; Archive
messages.

## New message window

Title **Enter a new message**. Menu: **Post to Outbox**, **Select Template**, **Attachments**, **Spell
Check**, **Save in Drafts**, **Close**. Fields: **From** (the call sign picker), **Send as** (Winlink
Message, Radio-Only Message, Post Office Message, Peer-to-Peer Message), a **Request message receipt**
check box, **Set Defaults**, then To, Cc (both are buttons that open the address picker), Subject, and
Attach (read-only; lists the attached files), with the body below.

- **Select Template** opens the **Template and Forms Manager**. Menu: Select, Close, Add, Remove, Edit.
  The tree has three roots: **Standard Forms (version 1.1.22.0)** (the family folders as on disk, plus
  `Changelog.txt`), **Global Templates** and **`<CALL>` Templates**. The leaves are the forms' `.txt` file
  names, for example `ICS USA Forms > ICS213 General Message.txt` and `Form-309 Communications Log.txt`.
  Choosing a form's `.txt` and clicking Select is what opens the HTML form.
- **Attachments** opens a list (File Name, Size (kb)) with Finished, Add, **Edit/Resize-Image**,
  Open/View, Delete, Save-As and **Save-as-pdf**. Images are resized by hand here; Pat converts them on
  its own (samples README).
- **Save in Drafts** means a message can be parked without being queued. That's relevant to the folder
  our import-file writer should target.

## How WE opens a form (seen 2026-11-17, ICS-213)

- After Select, WE writes a **filled-in copy of the form's HTML** to `<CALL>\Temp\ICS213_Initial.html`
  and opens it in the **default browser** (here Chrome) as
  `file:///C:/Users/<user>/AppData/Local/Programs/RMS%20Express/KE7KDQ/Temp/ICS213_Initial.html`.
- In the copy, `{FormServer}:{FormPort}` has become `localhost:8001`: the form tag reads
  `action="http://localhost:8001"`. Port 8001 is held through Windows' HTTP.sys (`netstat` shows PID 4,
  System), which is how a .NET `HttpListener` shows up.
- **So the oracle helper (roadmap 1o) can be Playwright.** It opens that Temp file in its own Chrome
  profile, loads a Save Data file, clicks Submit (which posts to WE on 8001), and WE puts the message in
  the Outbox. It only reads WE's folder, never writes to it. Still to check: does WE accept a post when
  no new-message window is waiting, and does it accept one from a second browser?
- Form header: **Setup** (an agency or group name; a test one was set) and the "THIS IS AN EXERCISE"
  box, **Load ICS213 INITIAL Data**, Form Instructions. Footer: **Submit**, **Save ICS213 INITIAL
  Data**, Reset Form. Position fields: Latitude, Longitude, MGRS, Grid. These default to the centre of
  the grid square in WE's settings (CN87SK here).
- **Two version strings in one template:** the footer shows `Ver 43.48`, but Save Data, the message
  body and the viewer XML all carry `ICS 213  v.43.8` (two spaces). The checker keys on the data string.
- **The form's own instructions describe route 5.** The initial 213 HTML is meant to work outside WE:
  someone without WE fills it in and saves the data, hands the file to the radio operator, and the
  operator loads it into their 213 and sends it. (Replies and the viewer don't work outside WE.) Our
  Save Data writer does what the template's author intended.

## First WE Save Data and Submit (2026-11-17)

- **Save ICS213 INITIAL Data** first shows a JavaScript prompt with the suggested name
  `ICS-213 data YYYY-MM-DD HH_MM.txt` (local time), then Chrome's Save As. The file is
  `test/samples/we/we-1.8.6.0-ics213-v43.8-savedata.txt` (made-up content).
- **The file matches Pat's Save Data byte layout**: the same 44 keys in the same order, 2-space indent,
  LF, no final newline. The only fixed-value difference is that WE fills in `theMsgSender` (`KE7KDQ`),
  where Pat leaves the literal `{var MsgSender}`. `location_source` follows the data (`GRID SQUARE`
  here, `FORM ENTRY` in Pat's sample). **So one Save Data writer serves both programs.** It passes
  `emcomm-forms check` with no issues.
- **Field length limits** come from the inputs' `maxlength` (ICS213_Initial.html, v.43.8): inc_name 30,
  to_name 60, fm_name 60, **Subjectline 50**, Mdate 10, Mtime 9, Approved_Name 30, Approved_PosTitle 30,
  MGRS 25, Grid 8, GPS2 40, testCall 13, theMsgSender 13. A longer subject was cut at 50 characters
  while typing. **Writer and checker:** warn on any value longer than its limit. Whether Load Data
  truncates such values is untested; that needs a sample.
- **Submit** shows an alert telling you to click OK and close the browser window, then the browser
  lands on `http://localhost:8001`. WE fills the open new-message window: Subject `ICS-213: <subject> -
  <date> <time>` (here `ICS-213: I fell into a well, recovered, but don't want othe - today now`; date
  and time are copied from the form's free-text fields), Attach
  `RMS_Express_Form_ICS213_Initial_Viewer.xml;FormData.txt;`, and the body (exercise line, numbered
  fields, a `[Sender: ... Lat: ..., Lon:..., MGRS: ; Location source: Grid square]` line, then
  `Express Sending Station`, `Senders Express Version: 1.8.6.0`, `Senders Template Version: ICS 213
  v.43.8`, `[No changes or editing of this message are allowed]`). **To stays empty**; the operator
  fills it in and clicks Post to Outbox. So Submit needs a new-message window waiting.

## Seven more Save Data files from a WE 1.8.6.3 user (received 2026-11-17)

An early tester sent seven Save Data files saved in WE 1.8.6.3 (Standard Forms 1.1.22.0) from ETO
exercises, plus screenshots of where each template sits. They hold real call signs, names and positions, so they stay out of
the repo (rule 7) and are checked locally only.

| Form | Template folder | `Templateversion` | Saved |
| --- | --- | --- | --- |
| ICS-213 | ICS USA Forms | `ICS 213  v.43.8` | 2026-11-15 |
| ICS-213RR | ICS USA Forms | `ICS 213RR v. 14.6` | 2025-12-15 |
| ICS-214 | ICS USA Forms | `ICS 214 v 17.10` | 2025-12-15 |
| ICS-205 | ICS USA Forms | `ICS205- v 19.5` | 2023-08-22 |
| HICS-251 | HICS Forms | `HICS-251 v .6` | 2026-11-16 |
| Hospital Status | General Medical Forms | `General Hospital Status 2.2` | 2024-04-18 |
| Field Situation Report | General Forms | `Field Situation Report V 0.1.5` | 2022-05-14 |

- **Same layout in all seven:** flat JSON object, 2-space indent, LF, no final newline,
  `Templateversion` the last or nearly last key. Non-ASCII is written raw as UTF-8 (a typed curly quote
  in the ICS-205 is `E2 80 9C`, not `“`). All pass `emcomm-forms check` with no issues.
- **Not every value is a string:** `exbtn` (the exercise toggle) is a JSON number, `0` in the 213 and
  `1` in Hospital Status. The writer must keep each key's JSON type (the checker already allows
  numbers and only errors on objects).
- **`Templateversion` has no common format**: see the table (`v.`, `v`, `v.` with a space, `V`, `- v`,
  bare number, a double space in the 213's). Match it per form as an exact string, never parse it.
- **`FormData` key only in some templates** (213, HICS-251, Hospital Status, Field Situation), holding
  the template's `FormData.txt` pattern as in the 213.
- **Older saves still carry the current version string** where the template didn't change: the 2026-11-15
  ICS-213 has the same 44 keys in the same order as our 1.8.6.0 save. WE 1.8.6.0 → 1.8.6.3 did not
  change the 213's Save Data.
- **File names** follow `<form> data YYYY-MM-DD HH_MM.txt` for the ICS 213/214 only; the others are
  `ICS205 …`, `ICS213RR …`, `HICS251 …`, `Hospital Status …`, `Field Situation Data  …` (two spaces).
  The suggested name is the template's choice, so a writer should offer the same name per form.

## What the help file says that matters to us

### Form server (Settings > Form settings)

- WE swaps `{FormServer}` (default `localhost`) and `{FormPort}` (default **8001**, changeable) into a
  form's HTML. The form's Submit posts to `http://{FormServer}:{FormPort}`, where WE is listening. This
  matches `create_templates.pdf` (Winlink's guide to custom HTML forms), so the oracle helper (roadmap 1o) can drive the form in
  a browser with Playwright. WE opens a `file:///` copy of the form (see above).
- Other settings there: open forms automatically when a message is selected; attach the form XML to
  messages going to Internet addresses (if cleared, the form attachments are dropped for
  Internet-only recipients); bring WE to the front after Submit; map filtering by sender.

### Export and Import messages (one XML format)

- **Message > Export selected messages** writes the highlighted messages from the current folder to **one
  XML file**: message contents, attachments (encoded), folder name and type, and metadata. Archive writes
  the same format, by date range. An existing file of the same name is overwritten.
- **Import messages** reads that XML back into the active call sign's folders. It keeps the folder
  names, creates any missing Personal or Global folders, and **skips a message whose ID is already
  known**, even one in Deleted Items. It never overwrites or updates a message.
- **Imported Outbox messages stay in the Outbox and go out in the next session.** For our "WE import file"
  writer (release 0.2), this is the route into WE. The docs and the writer must warn that importing
  queues the messages to send. Writing to a folder other than the Outbox (Drafts, Saved Items) may be
  safer; needs a sample.

### Import form xml file: a second oracle, for the viewer XML (phase 2)

- **Message > Import form xml file** creates a **new Inbox message** with the files you pick attached: a
  form XML (the viewer `RMS_Express_Form_*.xml`) and optionally its `FormData.txt`. You can set the From
  text (default `(Imported)`), the subject (default: the XML file name) and the body (default: a list of
  the files). The message is dated now (UTC). Nothing is sent.
- So the viewer XML we write can be **opened and rendered by WE itself**, which tells us whether WE reads
  it. That is the check phase 2 needs, without hand-building a whole message.

### Generate Form 309 Communications Log is a report, not a form message

- It builds a **PDF** (and optionally a **CSV**) from the messages in the folders you tick, over a date
  range (UTC or local). It does **not** create a message. You set Task ID, Task Name, Operational Period,
  Operator name and Station ID; recipients go on separate lines or one combined line; page layout and the
  date format are adjustable. In the CSV, one row per message, recipients separated by semicolons; the
  file name, delimiter and columns are chosen in a dialog.
- The manual-entry 309 is the separate form template (`Form-309_Initial.html`). The samples list is
  corrected: what to keep from the generator is its CSV (and the PDF for reference), not an exported
  message.

## From `Standard Templates\Changelog.txt` (1.1.22.0, 2026-09-25)

- 1.1.22.0: "repeated Save Data operations" had been **nesting earlier saved files inside later saves**
  on several forms; now fixed. Older forms had the same bug: an ICS-213 save file "expanding in size"
  and an ICS-214 Save Data that grew with every save. **Checker:** Save Data files made by older
  templates may carry a nested earlier save. Look for it in samples, and warn rather than error.
- The 309 was renamed from "ICS309" to "Form-309" (it isn't strictly an ICS form). An older 309 had **To
  and From swapped in its XML** (fixed). The checker's 309 layer should key on the template version.
- The ICS-213 subject is prefixed so that it reads as an ICS-213 (matches the `ICS-213: <subject> -
  <date> <time>` seen from Pat).
