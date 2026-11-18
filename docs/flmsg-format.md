# FLMSG file format and built-in forms

Facts about FLMSG's data files, learned 2026-11-17 by **reading** the FLMSG source (GPL; GitHub mirror
w1hkj/flmsg, version 4.0.20, June 2022). No code was copied; this page states the format in our own words
so writers and checker rules can be built from it. Field tags are facts about the file format.

**Not yet confirmed by a real file.** Rule 3 still holds: every writer is golden-tested against files
FLMSG itself saved (phase 0 list in `test\samples\README.md`). FLMSG's current release may be newer
than 4.0.20; record the version when installing and recheck anything that differs.

## Data file layout

```
<flmsg>4.0.20
:hdr_fm:<len> <value>
:hdr_ed:<len> <value>
<ics213>
:inc:<len> <value>
:to:<len> <value>
...
```

- Line 1: `<flmsg>` then the program version, LF.
- Optional header fields `:hdr_fm:` (who sent it) and `:hdr_ed:` (who edited it).
- The form tag on its own line (`<ics213>`, `<radiogram>` ... see the table).
- Then one line per field: tag, **length in bytes** (decimal, no padding), one space, the value, LF.
- **Empty fields are left out.** A value may contain line breaks; the length covers them, so there is no
  escaping of `:` or newlines at all.
- Booleans (a few forms) are written as `:tag: T`; false booleans are left out.
- Line endings: FLMSG writes `\n` and opens files in text mode, so **on Windows the file likely has CRLF**
  while the lengths were counted with LF. Must check against a Windows sample: if so, a reader has to
  convert CRLF to LF before using the lengths, and a writer has to decide which to emit.
- Encoding: the value bytes are whatever FLTK holds (UTF-8). Check with an accented sample.

### Header values

Each header value starts with a newline, then one line per station: `CALL YYYYDDMMhhmmss` (UTC).
Note the date is **year, day, month** (FLMSG's date format 4, `%Y%d%m`), then `%H%M%S`. Each station
appears once (an earlier line for the same call is removed when it edits again), and blank lines are
collapsed. Example value (17 Nov 2026 06:15:00Z): `"\nKE7KDQ 20261711061500"`, written as
`:hdr_ed:22 ` + that value.

### How FLMSG reads a field (matters for the checker)

The reader looks for the **first occurrence of the tag text anywhere in the file**, reads the number after
it, skips to the next space and takes that many bytes. Consequences:

- If an earlier field's value contains a later field's tag text (a message saying `:rp:` or `:to:`),
  FLMSG reads the wrong place. **Checker rule:** error when any value contains the text of a tag that
  appears later in the same form.
- A wrong length silently truncates or swallows the next field. **Checker rule:** error when a length
  does not land exactly on a line end.
- Old-style files: if no field is found with the current tags, FLMSG retries with an older tag set
  (`afields`). Not needed for writing; a reader could accept them.

### Compression and base64

When "use compression" is on (or for file transfer), the field block (not the header) is LZMA-compressed:
`\x01LZMA`, original length (4 bytes, big-endian), LZMA properties, data; the whole thing base64-encoded
between `[b64:start]` and `[b64:end]`. Also `[b128:start]` / `[b256:start]` variants. Our writers never
compress (VISION: no compression; B2F compresses on the link). The checker should recognise it and say
"compressed FLMSG data: not checked" rather than fail.

### Wrap (what goes over the air)

```
[WRAP:beg][WRAP:lf][WRAP:fn ics213.213]<file text, LF line ends>[WRAP:chksum XXXX][WRAP:end]
```

- `[WRAP:crlf]` instead of `[WRAP:lf]` when the original had CRLF; the payload itself is always converted
  to LF first.
- Checksum covers `[WRAP:fn name]` plus the text. It is **CRC-16/MODBUS** (reflected polynomial 0xA001,
  start 0xFFFF, no final XOR), each char's low byte, written as 4 uppercase hex digits. Standard
  algorithm; write it from the spec, with the published check value (`123456789` gives `4B37`) as a test.
- Sent to FLDIGI over XML-RPC, FLMSG adds `\n\n\n... start\n` before and `\n... end\n\n\n` after.

## Built-in forms (4.0.20)

| Family | Form tag | Data ext (template ext) | Field tags | Rows |
|---|---|---|---|---|
| ICS | `<ics203>` | `.203` (`.203T`) | inc dat tim opp icc icd ics ici icl pre; agency[n] agency_name[n] tech_spc[n]; planning_*, logistics_*, ops_*, b1-b3 director/deputy/div[n]/grp[n], air ops, finance_* units | arrays |
| ICS | `<ics205>` | `.205` (`.205T`) | nam dt1 dt2 dt3 prp cnty stat lat lon + channel table | table |
| ICS | `<ics205a>` | `.25A` (`.25T`) | inc dfm tfm dto tto pre pos dtm; asg[n] nam[n] inf[n] | table |
| ICS | `<ics206>` | `.206` (`.206T`) | nam opp dat tim proc prep rvwr; medical aid stations msta/mloc/mpar0..; transport tname/taddr/tphon/tpara0..; ambulance aname/aloca/apara0..; hospitals hname/haddr/hphon/hatim/hgtim/hheli/hburn0.. | numbered |
| ICS | `<ics213>` | `.213` (`.213T`) | inc to fm p1 p2 sb d1 t1 mg s1 p3 rp d2 t2 s2 p4 | - |
| ICS | `<ics214>` | `.214` (`.214T`) | inc dat tim opp und unl pre; nam[n] pos[n] hom[n] (roster); at[n] ev[n] (activity log) | 16 |
| ICS | `<ics216>` | `.216` (`.216T`) | inc dat tim br agc opp tfr pre; div[n] agy[n] ag[n] id[n] rr[n] | table |
| ICS | `<ics309>` | `.309` (`.309T`) | inc dfm tfm dto tto pre dtm net opr; tm[n] to[n] fm[n] msg[n] | **34** |
| HICS | `<hics203>` | `.H203` | inc dat tim opp icc ics ici icl pre facility; hospital section chiefs and units | - |
| HICS | `<hics206>` | `.H206` | numbered `:1:` .. `:47:` | - |
| HICS | `<hics213>` | `.H213` | numbered `:1:` .. `:18:` with 5a-c, 6a-c, 7a-c | - |
| HICS | `<hics214>` | `.H214` | numbered `:1:` `:2:` `:2a:` `:3:` .. `:8:` | - |
| Amateur | `<radiogram>` | `.m2s` (`.m2t`) | nbr prec hx d1 t1 dt2 dt3 to tel opn msg sig op2 ck sta org ori dlv sto snt dt4 rfm rnt dt5 svc std | - |
| Amateur | `<iaru>` | `.i2s` (`.i2t`) | nbr prec sta ck org d1 t1 to msg fm rcv d2 t2 sto d3 t3 | - |
| Amateur | `<netlog>` | `.Fnet` | same tags as ICS-309 (net log) | 34? |
| General | `<plaintext>` | `.p2s` (`.p2t`) | tt to fm sb dt tm mg | - |
| General | `<csvform>` | `.c2s` (`.c2t`) | mg (the whole CSV text) | - |
| General | `<blankform>` | `.b2s` (`.b2t`) | mg | - |
| General | `<customform>` | `.k2s` (`.k2t`) | mg (custom HTML form's data) | - |
| CAP (Civil Air Patrol) | `<cap105>`, `<cap110>` | `.c105F`, `.c110F` | 105: prec dtm from to info subj grpcnt msgtxt ...; 110: mnbr sta date ds_a..f; time[n] chref[n] call[n] rem[n] | - |
| MARS | `<mars_army>`, `<mars_msg>`, `<mars_daily>`, `<mars_net>`, `<mars_ineei>` | `.nas`, `.msg`, `.mds`, `.mns`, `.mis` | military-style DTG/precedence messages, net reports, INEEI situation report | - |

Also in the source: weather report forms (`.s2s` severe weather, `.w2s`, `.fstm2s` storm report),
Red Cross forms (`.39s` 5739, `.3as`/`.3bs` 5739A/B, `.sws` safe-and-well), a transfer form, and the
`.f2s`/`.f2t` generic data file the manual mentions. Not yet looked at in detail.

### Table rows

Row tags are written with the brackets kept and a **zero-based** index: `:tm[0]:`, `:tm[1]:` ...
`:tm[33]:`. Rows are written in order, field by field (309: tm, to, fm, msg per row), and empty cells are
left out like any other field. ICS-214's helper only builds indexes up to 19, which is fine for its 16 rows.

### Radiogram check (ARRL count)

FLMSG's "check" button, when "standard format" is on: upper-cases the text, joins lines, drops a final
period, converts punctuation to words (its table), turns a `.` between digits into `R` and other periods
into ` DOT `, collapses spaces, then **counts words separated by single spaces**. It re-flows the text to
N words per line (a setting) and adds `ARL ` to the check when the text has `ARL`. The ARRL rules
(FSD-218, Methods and Practices) are the spec for our own rule; FLMSG's behaviour is what operators see.

## Corrections to earlier notes

- **ICS-309 is built in** (`.309`, 34 rows). Earlier notes, and a plan to send the 309 as
  CSV-text, assumed it wasn't. ICS-213RR is still not built in.
- `.f2s` is a separate generic data extension, not ICS-213's; ICS-213 is `.213`.
- Field encoding is now known (length-prefixed, no escaping), so a writer needs samples only to confirm
  line endings, encoding and the header.

## What this changes in the plan

- Phase 4 (FLMSG) can cover 213, 214, 309, plaintext, CSV-text and radiogram as data tables, plus `.wrap`
  with CRC-16/MODBUS. The form definitions in `src\check\forms.ts` should gain an FLMSG tag per field.
- Checker FLMSG layer: version line, form tag known, every length lands on a line end, no tag text inside
  an earlier value, known tags per form (unknown = warning), row index range, wrap checksum.
- Samples still needed (phase 0): one each from FLMSG on Windows, plus one with accents, to settle CRLF
  and encoding.
