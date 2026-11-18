/**
 * Minimal logger interface, shaped so `console` and pino/winston-style loggers fit as is.
 * Library code takes a Logger by injection and never logs on its own.
 */
export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

/** Logger that discards everything (the default). */
export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};
