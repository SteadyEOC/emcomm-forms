# Contributing to emcomm-forms

Thanks for helping. Samples from real programs are the most useful thing you can send (see
`test/samples/README.md` for what is wanted and how to make them). Code and docs are welcome too.

## The rules

Comments and docs in this repo cite these by number ("rule 3").

1. **MIT, and it stays MIT.** Never copy code from GPL or AGPL sources into this project: paclink,
   winlink-mail-client, flmsg/fldigi, RangerTrak and the like. Reading them to understand a format is
   fine. MIT sources (Pat, wl2k-go and others) may be borrowed from with their notice kept in `NOTICE`.
2. **Never ship Winlink's form templates.** They have no open licence. Field names learned from our own
   samples are facts and may go in; the template files never do. A generator may read templates already
   installed on the user's own PC.
3. **Real exports are the spec**, not our reading of the format. Every writer is golden-tested byte for
   byte against a sample saved by the real program, and each test is shown to fail when a field is wrong.
4. **Make files, never transmit.** No network, no radio, no writing into Winlink Express's or Pat's data
   folders, no readers that pull messages from a mailbox. Readers that parse a file handed to them are
   fine (the checker uses them).
5. **Pure functions, no dependencies.** No DOM and no Node-only APIs in the core; it runs in browsers
   and Node. Zero runtime dependencies.
6. **Strict by default.** An error only where a reader would break or misread the file; style is a
   warning.
7. **No real incident data or personal details** in samples or tests. Use made-up names, `example.com`
   addresses and your own call sign at most.
8. **Neutral.** No application's names, imports or assumptions in the API. Application-specific code
   (how an app maps its own data into a form) stays in that app and calls this library.

## Working on it

- `npm ci`, then `npm run check` (typecheck, tests, build, examples). CI runs the same on Node 22, 24
  and 26.
- Dependencies use caret ranges; commit the lockfile.
- A new writer or form needs a real sample first (rule 3). If you can't share one publicly, open an
  issue describing the program, version and form, and we'll work out a made-up equivalent.
