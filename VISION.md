# EMCOMM Forms: vision

**Mission:** any emergency-communications form message, in any language, through any program, is
**correct when it is made and checkable before it is sent**, so the station at the other end reads exactly
what was meant. The library makes files and checks files. It never transmits (rule 4).

This page is the long view: where the project could grow, and the loose architecture that leaves room for
it. `ROADMAP.md` is what we are actually building, in order. Standards and reference material for each
part: `docs/standards-and-references.md`.

**Not radio only.** A form message is the same message whatever carries it: HF or VHF
radio, a mesh (Meshtastic, AREDN, Reticulum, FrogNet), a point-to-point or WiMAX-class wireless link, the
internet, or a USB stick walked across the room. The form model and the checker know nothing about the
transport; each transport is a writer plug-in with its own limits (below).

## Horizons

| Horizon | Scope |
|---|---|
| **Now** | ICS-213 on Winlink Express, Pat and FLMSG: Save Data writer, plain text, `.b2f`, WE import file; the strict checker with strictness profiles. |
| **Next** | The whole **ICS form set** as data (201 through 260, with 205, 205A, 206, 213RR, 214, 309 first); the ARRL/NTS radiogram; FLMSG's built-in forms; each Winlink standard form our users ask for. |
| **Later** | Other form families (table below); readers for every format we write; the drop-a-file check page; published JSON Schemas; translations. |
| **Way future** | Bridges to data-exchange standards (CAP, EDXL, HXL, XLSForm), plug-ins from other groups, assistants (AI hooks), batch and streaming checks for EOC and exercise scale. |

## Form families in use (survey, 2026-11-16, from memory: verify before building)

| Family | Where | Examples | Notes |
|---|---|---|---|
| **ICS / NIMS** (FEMA) | US, adopted widely | 201 Briefing, 202 Objectives, 203 Org List, 204 Assignment, 205/205A Comms Plan/List, 206 Medical Plan, 207 Org Chart, 208 Safety, 209 Status Summary, 210 Resource Status Change, 211 Check-in, 213 General Message, 213RR Resource Request, 214 Activity Log, 215/215A Planning/Safety, 218 Support Vehicle, 219 T-cards, 220 Air Ops, 221 Demob, 225 Performance, 226 Individual Performance, 230 Meeting Schedule, 233 Open Actions, 260 Resource Order | The base set. FEMA's ICS Forms Booklet is the reference. 309 (Comms Log) is in common use but not a core FEMA form. |
| **NWCG ICS** | US wildland fire | Variants of the ICS forms, plus fire-specific ones | Same numbers, different fields. Needs versioned definitions. |
| **HICS** | US hospitals | HICS 203, 206, 213, 214, 251 Facility System Status, 254 Disaster Victim/Patient Tracking | California EMSA maintains it; FLMSG has HICS forms built in. |
| **ICS Canada** | Canada | ICS forms in **English and French** | A real bilingual case. |
| **AIIMS** | Australia, NZ (CIMS) | Situation reports, incident action plans | Different model from ICS. |
| **JESIP** | UK | **METHANE / ETHANE** incident reports | Short structured report; also NATO usage. |
| **Military / NATO-style** | Worldwide | 9-line MEDEVAC, SALUTE, SITREP, LACE | Fixed-line formats; MARS uses similar. |
| **Amateur traffic** | US (ARRL NTS, RRI), worldwide (IARU) | **Radiogram** (preamble, check, address, text, signature), IARU message | FLMSG `.m2s`, Winlink has a radiogram form. The check (word count) is a checker rule waiting to happen. |
| **Winlink standard forms** | Winlink users worldwide | ICS set, Damage Assessment, Field Situation Report (FSR), Hospital Status, Welfare/Safe-and-Well, Check-in, Quick Message, Bulletin, Position report, localised versions | Template files are not open (rule 2). We learn field names from samples. |
| **Red Cross / NGO** | US and international | Shelter counts, Disaster Welfare Inquiry, Safe and Well | Often private forms; partner by invitation. |
| **SHARES / federal HF** | US government | SHARES message formats | Not amateur; different rules on encryption. |
| **Medical handover** | EMS worldwide | Triage tags (START/SALT), MIST/ATMIST handover, TCCC card | Small, fixed, safety-critical. |
| **Maritime / SAR** | IAMSAR, GMDSS | SAR SITREP, distress relay formats | Defined by IMO/ICAO. |
| **Humanitarian data** | UN, NGOs | HXL-tagged tables, Kobo/ODK forms (XLSForm) | Not radio forms, but where EOC data ends up. |

**Data-exchange standards** (bridges, not forms): OASIS **CAP** (alerts), **EDXL**-DE (envelope),
EDXL-RM (resource messaging, the machine cousin of ICS-213RR), EDXL-SitRep (cousin of ICS-209),
EDXL-HAVE (hospital availability, cousin of HICS 251), NIEM Emergency Management, **HXL**, ODK
XForms / **XLSForm** (a widely used form-definition format we could learn from or import).

## Parallel programs and transports (all as file targets; we never drive the radio or the network)

Winlink (Winlink Express, Pat, RadioMail, Winlink web), NBEMS (FLDIGI + FLMSG + FLAMP), JS8Call, VarAC,
D-RATS (D-STAR, has its own forms), APRS messaging, AREDN mesh (email and web), Meshtastic/MeshCore
(tiny payloads: needs a compact encoding), satellite messengers (inReach-class, 160 characters), plain
email and SMS, and EOC software (WebEOC, Veoci, D4H and similar) by import file. Each is a **writer
plug-in** with its own size limit, character set and line rules. The form model stays the same.

- **FrogNet** (John Fawcett's network shared-memory system; <https://github.com/FawcettJohnW>, repo
  `FrogNet-Living-Network`, GPL-2.0-only: read, never copy): **full support wanted**. What FrogNet carries and how a form would land in it is still to learn.
  Likely a writer (and reader) plug-in for whatever record format FrogNet shares.
- **Reticulum** (Reticulum Network Stack with LXMF messaging; runs over LoRa, packet radio, serial and
  IP): **later**. It is a transport, and this library never transmits, so its role
  here is small: a form as the text of an LXMF message, which the plain-text writer mostly covers. It
  encrypts by default, which clashes with Part 97 on amateur bands in normal use (an emergency is
  different); fine on non-amateur links. Revisit when a group asks.

## Architecture that leaves room

The core stays small, pure and dependency-free (rule 5). Everything else plugs in. Dependency injection
is plain: you pass a registry and a logger into the function; there is no container framework.

```text
             +------------------- core (pure, no I/O) -------------------+
 bytes ----> | reader --> message model --> rules --> issues --> report  | ----> text / JSON / SARIF / JUnit
             |              ^      |                                     |
 form data --|---> form definition (data) --> writer -----------------> | ----> bytes (.b2f, WE XML, Save Data, FLMSG, ...)
             +-----------------------------------------------------------+
                     ^ registry: forms, readers, writers, rules, reporters, profiles, locales
                     ^ logger (injected; no-op by default)
 adapters (separate packages): CLI, browser check page, Node file batch, MCP server, RangerTrak
```

- **Form definitions are data**, not code: fields, types, required-ness, limits, labels per language,
  and a mapping per output format (Save Data key, viewer variable, FLMSG tag, radiogram line).
  Versioned by form and template version. Consider XLSForm or JSON Schema plus UI hints as the shape.
- **Plug-in kinds:** form definition, reader, writer, rule (check), reporter, profile, locale. A plug-in
  is a plain object with an id and a version; registering two with one id is an error.
- **Rules** have stable ids (`b2f/body-count`), a default level and documentation. Profiles (`strict`,
  `standard`, `lenient`, `emergency`) and per-rule overrides follow ESLint conventions; results can be
  written as SARIF so CI and code-scanning tools read them. Emergency mode lets everything through and
  still logs every issue. **Both profiles**: `emergency` (never block a message,
  log everything) and `proven` (pass only forms, fields, characters and sizes that a golden sample has
  shown arriving intact at the other end; everything else is an error).
- **Logging** is an injected interface (`debug/info/warn/error` with structured fields), compatible
  with `console` and common loggers. The library never prints and never logs message content unless asked.
- **I/O lives outside the core:** reading folders, watching an outbox, serving a page. That keeps the
  core usable in a browser, a CLI, a server or another language (via the published schemas).

## Languages, scripts and encodings

- Inside, all text is Unicode (normalised to NFC). Bytes appear only at the edges, where each writer
  states its charset (Winlink body ISO-8859-1, B2F headers ASCII with RFC 2047 encoded words, XML UTF-8).
- When a target cannot carry a character, the writer folds it (`é` to `e`) **and reports it**, or refuses
  in strict mode. Detect mojibake (UTF-8 read as Latin-1) on input.
- Labels, hints and checker messages come from message catalogues keyed by BCP 47 tags (English first;
  Spanish and French early, for US and Canadian use). Right-to-left scripts and CJK must not break layout
  code (line wrap counts grapheme clusters and display width, not UTF-16 units).

## Scale and production use

- The library stays a **pure function per message**: deterministic output for the same input (so retries
  and queues are safe), bounded memory, size limits on every input.
- **Batches:** a check or write over an iterable or async iterable of messages, with a summary report and
  per-message results, for exercises (ETO's ~250 messages a week) and EOC imports. A streaming reader for
  large WE exports later.
- **Queues and intermittent links belong to the application** (RangerTrak, an EOC gateway), not this
  library. We help them: stable message IDs, a content hash for de-duplication, idempotent writes, and
  results that can be stored and resumed.

## Security for public-safety environments

- **Hostile input:** the parsers refuse DTDs (no XXE or entity expansion), cap size and depth, avoid
  regexes that can backtrack badly, and get fuzz tests. A malformed file must give an issue, never a crash or hang.
- **Supply chain:** zero runtime dependencies; lockfile committed; signed release tags; npm provenance;
  an SBOM (CycloneDX) with each release; OpenSSF Scorecard; reproducible builds as a goal.
- **Privacy:** no message content in logs by default; a redaction hook for PII; samples and tests hold no
  real people's data (rule 7).
- **Integrity, not secrecy, on amateur bands:** FCC Part 97 forbids codes and ciphers that obscure meaning,
  so the library offers no encryption for amateur use. Content hashes, and perhaps signatures (get advice
  first), may fit. Non-amateur deployments (SHARES, agency networks) can wrap our files in their own
  encryption outside this library.
- The check page works offline, uploads nothing, and meets WCAG 2.2 AA.

## AI hooks (optional, outside the core, human in the loop)

- **MCP server** (separate package): tools to check a file, explain an issue, list forms, and draft a form
  file, so assistants can validate and prepare messages. It makes files only; it never sends.
- **Explainable output:** rule ids, hints and doc links in every issue, so a person or a model can explain
  "why this will break at the EOC" in plain words.
- **Draft from text or voice:** pull form fields from a free-text note or a radio transcript into the form
  model; a person confirms every field before a file is written. AI-drafted content is labelled.
- **Translation assist** for multilingual operations; **inbound triage** (summarise and sort received
  213s) for EOC tools built on our readers.
- **Offline first:** disasters cut the internet, so any AI feature must degrade to "off" cleanly, and should
  work with local models.

## Branding

Name: **EMCOMM Forms** (package `emcomm-forms`). A small, plain logo: a form sheet with a radio-wave arc,
high contrast, legible in one colour on paper, a fax or an e-ink screen. Used in the README, the check
page and release notes. No Winlink, ARRL or FEMA marks; "Winlink" appears only as a trademark mention. 
