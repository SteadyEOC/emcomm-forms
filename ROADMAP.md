# emcomm-forms roadmap

Long view: `VISION.md`. Standards and how firm each is: `docs/standards-and-references.md`.
Every writer waits for real samples from the real program (`CONTRIBUTING.md` rule 3).

**Releases:** 0.1 = Winlink form Save Data writer, plain text, Pat `.b2f`, FLMSG first cut, checker.
0.2 = Winlink Express import file. 1.0 after a real drill (a Winlink Thursday exercise sent end to end).

| Phase | What | Status |
| --- | --- | --- |
| **0. Samples** | Real files from Winlink Express, Pat and FLMSG in `test/samples/` (see its README for the wanted list). | Pat and WE in; FLMSG wanted |
| **1a. Save Data file** | `writeSaveData`: the form's own Save Data JSON, which the operator loads into the form with Load Data and submits; WE or Pat then builds the message itself. ICS-213, 213RR, 214, 205, HICS-251, Hospital Status 2.3, Field Situation 0.2.10, byte for byte against real saves. | ✅ 0.1.0. To do: confirm Load Data of writer output in WE; the 309 log once a 309 save exists |
| **1o. Oracle helper** | Test-only script, outside the published library: load a Save Data file into WE's form with Playwright, submit, export the message, stop at the Outbox (never sends). Makes golden files for later phases. | planned |
| **1. Text and envelopes** | Helpers (ASCII folding, byte sizes, RFC dates, quoted-printable, XML escape, Maidenhead, wrap, MID); `writeB2f` (byte-exact against Pat 1.0.1); `writePlainText` (own neutral layout, 72 columns). To do: an `OutgoingMessage` model, address normalising, Winlink Express import XML (0.2), long-subject RFC 2047 splitting. | ✅ mostly |
| **2. Form XML: ICS-213** | `RMS_Express_Form` viewer XML and `FormData.txt` builder, checked in WE (Message > Import form xml file), Pat and Winlink-Form-Viewer. For users without WE's form page. | planned |
| **2b. Strict checker** | `check(bytes, name)` with its own strict XML parser; layers for Save Data, viewer XML, FormData.txt, Pat `.b2f`, WE export; CLI `emcomm-forms check`. To do: body-vs-variables cross-check, WE import-file layer, JSON Schema export, FLMSG layer, an offline drop-a-file page. | ✅ first cut |
| **2c. Strictness profiles** | Rule ids, levels, profiles `strict`, `standard`, `lenient`, `emergency` (lets everything through, still logs), `proven` (only what golden samples show arriving intact); per-rule overrides, SARIF output, injected logger. | in progress |
| **3. 213RR, 309, 214** | Field maps, schemas, 309 paging. | planned |
| **4. FLMSG** | `writeFlmsg` (`.213`, `.309` up to 34 rows, `.p2s`, `.c2s`) and `wrapFlmsg` (CRC-16/MODBUS), from the format notes in `docs/flmsg-format.md`. **Untested against real FLMSG saves**; golden tests when samples arrive. | first cut |
| **4b. Other Winlink clients** | Check that Save Data files load unchanged in MacWinlink and Winlink on Android (WoAD). | needs testers |
| **Publish** | npm 0.1.x; public repo; 1.0 after a real drill. | ✅ npm, public repo |
| **All ICS forms** | Form definitions as data for the ICS set (201-260, NWCG and HICS variants, ICS Canada EN/FR), the radiogram with its check-count rule, FLMSG built-ins. Each from real samples. | later |
| **Plug-ins** | Registry of form definitions, readers, writers, rules, reporters, profiles, locales; plain dependency injection. Grows as forms and formats are added. | later |
| **i18n and encodings** | NFC everywhere, per-writer charset policy with reported folding, mojibake detection, message catalogues (English, then Spanish and French). | later |
| **Hardening** | Input size and depth limits, fuzz tests for every reader, ReDoS review; signed tags, npm provenance, SBOM, OpenSSF Scorecard. Before 1.0. | later |
| **Transports beyond radio** | The form model stays transport-neutral: FrogNet, mesh and internet links as writer plug-ins (`VISION.md`). | later |

## Not planned

Sending, receiving, radio or modem control, Winlink API calls, writing into client data folders, custom
FLMSG forms we'd have to distribute, encryption or compression.

## Users

[RangerTrak](https://rangertrak.org) (first user). Pat serves as a test oracle. If you use it, open an
issue and say what for; it helps decide what comes next.
