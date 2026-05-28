import { CkError } from '../errors.js';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Return true if `s` is a valid context slug. */
export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

/** Throw a CkError EUSER if `s` is not a valid slug, otherwise return it. */
export function assertSlug(s: string): string {
  if (!isValidSlug(s)) {
    throw new CkError(
      'EUSER',
      `invalid slug "${s}": must match ^[a-z0-9][a-z0-9-]{0,63}$ (lowercase letters, digits, hyphens; max 64 chars; starts with letter/digit)`,
    );
  }
  return s;
}
