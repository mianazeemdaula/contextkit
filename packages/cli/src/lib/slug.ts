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

/** Convert an arbitrary human name into a URL-safe slug. */
export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
  return s.length > 0 ? s : 'context';
}

/** Rough word count of a body of text. */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * cl100k-style token estimate: ~1 token per 4 characters (spec §4.3).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
