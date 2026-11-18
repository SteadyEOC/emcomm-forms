// Checker configuration, ESLint style: a profile (preset) then per-rule overrides.

import type { Logger } from '../log.js';
import { RULES, type RuleLevel } from './rules.js';

/**
 * strict: every warning becomes an error (CI, golden tests of writers).
 * standard: the registry levels (default).
 * lenient: only errors stay errors; warnings become info.
 * emergency: nothing blocks. Everything is still reported, never above 'warning', and `ok` is always true.
 */
export type Profile = 'strict' | 'standard' | 'lenient' | 'emergency';
/** ESLint style; 0, 1 and 2 are 'off', 'warn' and 'error'. */
export type RuleSetting = 'off' | 'info' | 'warn' | 'error' | 0 | 1 | 2;

export interface CheckOptions {
  /** Default 'standard'. */
  profile?: Profile;
  /** Overrides after the profile. Keys are rule ids or area wildcards like 'b2f/*'; an exact id beats a wildcard. */
  rules?: Record<string, RuleSetting>;
  /** `ok` is false when there are more warnings than this. */
  maxWarnings?: number;
  /** Receives one entry per issue. Default: discards. */
  logger?: Logger;
}

export const PROFILES: readonly Profile[] = ['strict', 'standard', 'lenient', 'emergency'];

export interface ResolvedConfig {
  profile: Profile;
  maxWarnings: number | undefined;
  levelOf(rule: string): RuleLevel | 'off';
}

const SETTINGS = new Map<unknown, RuleLevel | 'off'>([
  ['off', 'off'], ['info', 'info'], ['warn', 'warning'], ['error', 'error'], [0, 'off'], [1, 'warning'], [2, 'error'],
]);

const AREAS = new Set(Object.keys(RULES).map((id) => id.slice(0, id.indexOf('/'))));

export function resolveConfig(options: CheckOptions = {}): ResolvedConfig {
  const profile = options.profile ?? 'standard';
  if (!PROFILES.includes(profile)) throw new RangeError(`Unknown profile "${String(profile)}" (use ${PROFILES.join(', ')})`);
  const exact = new Map<string, RuleLevel | 'off'>();
  const wild = new Map<string, RuleLevel | 'off'>();
  const unknown: string[] = [];
  for (const [key, v] of Object.entries(options.rules ?? {})) {
    const isWild = key.endsWith('/*');
    if (!(isWild ? AREAS.has(key.slice(0, -2)) : Object.hasOwn(RULES, key))) {
      unknown.push(key);
      continue;
    }
    const level = SETTINGS.get(v);
    if (level === undefined) throw new RangeError(`Invalid setting for rule "${key}": ${JSON.stringify(v)} (use off, info, warn or error)`);
    (isWild ? wild : exact).set(key, level);
  }
  if (unknown.length) throw new RangeError(`Unknown rule(s) in rules: ${unknown.join(', ')}`);

  return {
    profile,
    maxWarnings: options.maxWarnings,
    levelOf(rule) {
      let level: RuleLevel | 'off' = RULES[rule]!.level;
      if (level === 'warning') {
        if (profile === 'strict') level = 'error';
        else if (profile === 'lenient') level = 'info';
      }
      const o = exact.get(rule) ?? wild.get(`${rule.slice(0, rule.indexOf('/'))}/*`);
      if (o !== undefined) level = o;
      if (profile === 'emergency' && level === 'error') level = 'warning';
      return level;
    },
  };
}
