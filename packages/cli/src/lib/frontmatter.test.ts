import { describe, it, expect } from 'vitest';
import { parse, serialize, defaultFlags, type ContextFrontmatter } from './frontmatter.js';

describe('frontmatter', () => {
  it('round-trips a full context', () => {
    const fm: ContextFrontmatter = {
      id: 'a1b2c3d4',
      slug: 'work',
      name: 'Work',
      tags: ['work', 'employer'],
      pinned: true,
      prependNewline: false,
      appendNewline: true,
      wrapInXml: false,
      xmlTag: 'context',
      version: 2,
      createdAt: '2026-05-28T12:00:00Z',
      updatedAt: '2026-05-28T12:00:00Z',
    };
    const out = serialize({ frontmatter: fm, body: 'Hello body.' });
    const back = parse(out);
    expect(back.frontmatter).toEqual(fm);
    expect(back.body.trim()).toBe('Hello body.');
  });

  it('applies defaults for missing fields', () => {
    const parsed = parse('just a body\n');
    expect(parsed.body.trim()).toBe('just a body');
    expect(parsed.frontmatter.name).toBe('');
    expect(parsed.frontmatter.version).toBe(1);
    expect(parsed.frontmatter.appendNewline).toBe(true);
    expect(parsed.frontmatter.xmlTag).toBe('context');
  });

  it('escapes special characters in strings', () => {
    const fm: ContextFrontmatter = {
      ...defaultFlags(),
      id: 'x',
      slug: 'work',
      name: 'work',
      version: 1,
      createdAt: '2026-05-28T00:00:00.000Z',
      updatedAt: '2026-05-28T00:00:00.000Z',
      description: 'has "quotes" and: colons',
    };
    const out = serialize({ frontmatter: fm, body: 'b' });
    expect(out).toContain('description: "has \\"quotes\\" and: colons"');
    const back = parse(out);
    expect(back.frontmatter.description).toBe('has "quotes" and: colons');
  });
});
