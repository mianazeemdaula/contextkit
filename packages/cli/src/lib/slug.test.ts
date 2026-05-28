import { describe, it, expect } from 'vitest';
import { isValidSlug, assertSlug } from './slug.js';

describe('slug', () => {
  it('accepts simple valid slugs', () => {
    expect(isValidSlug('work')).toBe(true);
    expect(isValidSlug('project-x')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
    expect(isValidSlug('123-abc')).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('-leading')).toBe(false);
    expect(isValidSlug('Upper')).toBe(false);
    expect(isValidSlug('has space')).toBe(false);
    expect(isValidSlug('has_underscore')).toBe(false);
    expect(isValidSlug('x'.repeat(65))).toBe(false);
  });

  it('assertSlug throws on invalid', () => {
    expect(() => assertSlug('Bad Slug')).toThrow(/invalid slug/);
    expect(assertSlug('good-slug')).toBe('good-slug');
  });
});
