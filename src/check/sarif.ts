// Minimal SARIF 2.1.0 output, so CI systems (GitHub code scanning and others) can read check results.

import { VERSION } from '../version.js';
import type { CheckResult } from './check.js';
import { RULES } from './rules.js';

const SARIF_LEVEL = { error: 'error', warning: 'warning', info: 'note' } as const;

/** A SARIF 2.1.0 log for the results of checking one or more files (`uri` is the file's path or URL). */
export function toSarif(results: { uri: string; result: CheckResult }[]): object {
  const ids = Object.keys(RULES);
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'emcomm-forms',
            version: VERSION,
            rules: ids.map((id) => ({
              id,
              shortDescription: { text: RULES[id]!.description },
              defaultConfiguration: { level: SARIF_LEVEL[RULES[id]!.level] },
            })),
          },
        },
        results: results.flatMap(({ uri, result }) =>
          result.issues.map((i) => ({
            ruleId: i.rule,
            ruleIndex: ids.indexOf(i.rule),
            level: SARIF_LEVEL[i.level],
            message: { text: i.hint ? `${i.message} (${i.hint})` : i.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri },
                  ...(i.line === undefined ? {} : { region: { startLine: i.line } }),
                },
              },
            ],
          })),
        ),
      },
    ],
  };
}
