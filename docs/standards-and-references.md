# Standards and reference material, by module

What each part of the library is checked against, and how firm that source is. Rule 3 still applies:
**where a real program's output and a document disagree, the real output wins** and we note the gap.

Firmness: **Standard** = published formal spec; **Vendor doc** = official but informal; **Source** = an
open-source implementation (MIT: may borrow with notice; GPL/AGPL: read only, never copy, rule 1);
**Samples** = only real files.

Compiled 2026-11-16, partly from memory: versions marked (verify) need checking before we rely on them.

| Module | References | Firmness | Notes |
|---|---|---|---|
| XML parser (`src/check/xml-parse.ts`) | W3C XML 1.0 (Fifth Edition); OWASP XXE Prevention Cheat Sheet | Standard | We implement a strict subset: no DTD, no namespaces. |
| Encodings (`src/encoding/`, `src/check/text.ts`) | Unicode Standard; RFC 3629 (UTF-8); ISO/IEC 8859-1; WHATWG Encoding Standard (windows-1252); Unicode UAX #15 (normalisation), UAX #29 (grapheme clusters) | Standard | Winlink body text is ISO-8859-1 in WE and Pat samples. |
| MIME (WE export/import) | RFC 5322 (message format), RFC 2045-2049 (MIME), RFC 2047 (encoded words), RFC 2231 (parameter values), RFC 2183 (Content-Disposition), RFC 4648 (base64) | Standard | WE deviates: a JPEG labelled `text/plain`, lower-cased `To` (samples). |
| Quoted-printable | RFC 2045 §6.7 | Standard | Done; WE's soft breaks at 76 match. |
| Dates | RFC 5322 §3.3; ISO 8601 / RFC 3339; B2F `YYYY/MM/DD HH:MM` UTC | Standard + Samples | |
| **B2F** (`src/check/b2f.ts`) | Winlink "B2F" message structure description (winlink.org, verify current URL); wl2k-go `fbb` package (MIT); Pat (MIT) | Vendor doc + Source + Samples | Our Pat 1.0.1 samples in `test/samples/pat/`. Byte counts, header order, trailing CRLF only after attachments. |
| Message IDs | wl2k-go MID rules (MIT) | Source | 1 to 12 characters. |
| **Winlink form viewer XML, FormData.txt** | Winlink "Creating your own HTML Forms" (`create_templates.pdf`); samples | Vendor doc + Samples | No schema exists; ours would be the first public one. |
| **Save Data JSON** (route 5) | Samples only; Bob KM6SO's notes | Samples | Template JavaScript decides; version by template version. |
| **WE export / import XML** | Samples only | Samples | |
| **FLMSG / flwrap** | Dave Freese W1HKJ ("W1HKJ & Associates"): https://www.w1hkj.org/ (help: `/flmsg-help/`, downloads: `/files/flmsg/`, SourceForge `fldigi` project); questions to the **nbems** list, https://groups.io/g/nbems (also `linuxham`). Flmsg source (GPL, read only). **Not w1hkj.com:** that old domain now redirects to an unrelated site (kylegentz.com, checked 2026-11-18), though FLMSG 4.0.24's own help links still point there. | Vendor doc + Samples (4.0.24 Windows, 2026-11-18) | Field-tag escaping undocumented. |
| **ICS forms** | FEMA ICS Forms Booklet (NIMS); NIMS doctrine (FEMA, 2017 3rd ed.); NWCG ICS forms (wildland); HICS guidebook (California EMSA); ICS Canada forms | Vendor doc | Field lists for the form-definition data. |
| **Radiogram** | ARRL FSD-218 (radiogram form); ARRL NTS Methods and Practices Guidelines; Radio Relay International materials | Vendor doc | Check-count rules belong in the checker. |
| Maidenhead locator (`src/geo/`) | IARU Region 1 locator description; common algorithm | Standard (de facto) | |
| MGRS / USNG | NGA standards (verify document number); FGDC USNG | Standard | Forms carry MGRS (ICS-213 sample). |
| Schemas for other languages | JSON Schema 2020-12; W3C XML Schema 1.1 (if we publish XSDs) | Standard | Phase 2b output. |
| Checker output | OASIS **SARIF 2.1.0**; JUnit XML (de facto); ESLint rule-config conventions (`off/warn/error`, presets, `--max-warnings`, exit codes 0/1/2) | Standard + de facto | Strictness profiles follow ESLint. |
| Logging | RFC 5424 (syslog severities); structured-logging conventions (pino/console shape) | Standard + de facto | Injected logger. |
| Data-exchange bridges (future) | OASIS CAP 1.2; OASIS EDXL-DE 2.0, EDXL-RM 1.0, EDXL-SitRep 1.0, EDXL-HAVE 2.0 (verify versions); NIEM Emergency Management domain; HXL; ODK XForms and XLSForm | Standard | Way-future horizon. |
| Languages | BCP 47 language tags; Unicode CLDR | Standard | Message catalogues. |
| Security | OWASP ASVS; NIST SP 800-218 (SSDF); SLSA; OpenSSF Scorecard; CycloneDX / SPDX (SBOM); npm provenance | Standard | |
| Amateur-radio rules | FCC 47 CFR Part 97 (§97.113 prohibited transmissions; §97.309-97.310 digital codes) | Law | No encryption for amateur use; integrity checks only, with advice. |
| Accessibility (check page) | WCAG 2.2 AA | Standard | |
| AI hooks (future) | Model Context Protocol (MCP) specification | Vendor spec | Separate package. |

## Gaps worth filling for the community

No public schema exists for the Winlink viewer XML, FormData.txt, Save Data or the WE export, and FLMSG's
field encoding is undocumented. Our samples, schemas and checker could become that reference.
