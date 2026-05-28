/**
 * Tiny ANSI logger. Disables color when not a TTY or when NO_COLOR is set.
 * No deps — keeps the install footprint minimal.
 */

const useColor = process.stdout.isTTY === true && !process.env['NO_COLOR'];

const ansi = (code: string, s: string): string => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);

/** Print an informational message to stdout. */
export function info(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

/** Print a success message in green to stdout. */
export function success(msg: string): void {
  process.stdout.write(`${ansi('32', '✓')} ${msg}\n`);
}

/** Print a warning in yellow to stderr. */
export function warn(msg: string): void {
  process.stderr.write(`${ansi('33', 'warn:')} ${msg}\n`);
}

/** Print an error in red to stderr. */
export function error(msg: string): void {
  process.stderr.write(`${ansi('31', 'error:')} ${msg}\n`);
}

/** Format a label dim/grey, for table-like output. */
export function dim(s: string): string {
  return ansi('2', s);
}
