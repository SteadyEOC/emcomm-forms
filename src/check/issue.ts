import { resolveConfig, type ResolvedConfig } from './config.js';
import { RULES } from './rules.js';

/** `error`: a reader would break or misread the file (rule 6). `warning`: style, or differs from what WE/Pat write. `info`: worth knowing. */
export type IssueLevel = 'error' | 'warning' | 'info';

/** One finding. */
export interface Issue {
  /** Stable rule id, `<area>/<kebab-name>`; see RULES. */
  rule: string;
  /** After the profile and rule overrides. */
  level: IssueLevel;
  /** Where the problem is, e.g. a field name, header name or element path. */
  path: string;
  message: string;
  hint?: string;
  /** The file checked; nested files read `outer > inner`. */
  file?: string;
  /** 1-based line in that file, where known. */
  line?: number;
}

export interface IssueExtra {
  hint?: string | undefined;
  line?: number | undefined;
}

/** Collects issues for one file. Nested files share the parent's list and configuration. */
export interface Sink {
  readonly file: string | undefined;
  readonly issues: Issue[];
  /** Adds an issue at the level the configuration gives the rule; a rule set to 'off' adds nothing. Unknown rule ids throw. */
  add(rule: string, path: string, message: string, extra?: IssueExtra): void;
  /** A sink for a file found inside this one (a B2F attachment, a MIME part). */
  nested(name: string): Sink;
}

export function createSink(file?: string, issues: Issue[] = [], config: ResolvedConfig = resolveConfig()): Sink {
  return {
    file,
    issues,
    add(rule, path, message, extra = {}) {
      if (!Object.hasOwn(RULES, rule)) throw new Error(`Unknown checker rule id: ${rule}`);
      const level = config.levelOf(rule);
      if (level === 'off') return;
      const issue: Issue = { rule, level, path, message };
      if (extra.hint !== undefined) issue.hint = extra.hint;
      if (file !== undefined) issue.file = file;
      if (extra.line !== undefined) issue.line = extra.line;
      issues.push(issue);
    },
    nested(name) {
      return createSink(file === undefined ? name : `${file} > ${name}`, issues, config);
    },
  };
}
