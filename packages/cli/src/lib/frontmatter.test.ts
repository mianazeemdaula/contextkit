import { describe, it, expect } from 'vitest';
import { parse, serialize } from './frontmatter.js';

describe('frontmatter', () => {
  it('round-trips a basic context', () => {
    const raw = `---\nname: work\ndescription: My job\ntags: [work, employer]\nversion: 2\nupdatedAt: 2026-05-28T12:00:00Z\n---\n\nHello body.\n`;
    const parsed = parse(raw);
    expect(parsed.frontmatter.name).toBe('work');
    expect(parsed.frontmatter.version).toBe(2);
    expect(parsed.frontmatter.tags).toEqual(['work', 'employer']);
    expect(parsed.body.trim()).toBe('Hello body.');
    const reser = serialize(parsed);
    const parsed2 = parse(reser);
    expect(parsed2.frontmatter).toEqual(parsed.frontmatter);
    expect(parsed2.body.trim()).toBe('Hello body.');
  });

  it('handles missing frontmatter', () => {
    const parsed = parse('just a body\n');
    expect(parsed.body.trim()).toBe('just a body');
    expect(parsed.frontmatter.name).toBe('');
    expect(parsed.frontmatter.version).toBe(1);
  });

  it('escapes special characters in strings', () => {
    const out = serialize({
      frontmatter: {
        name: 'work',
        description: 'has "quotes" and: colons',
        version: 1,
        updatedAt: '2026-05-28T00:00:00.000Z',
      },
      body: 'b',
    });
    expect(out).toContain('description: "has \\"quotes\\" and: colons"');
    const back = parse(out);
    expect(back.frontmatter.description).toBe('has "quotes" and: colons');
  });
});
