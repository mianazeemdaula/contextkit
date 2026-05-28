import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { buildProgram } from '../cli.js';
import { readContext } from '../lib/storage.js';

function fresh(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ck-add-'));
  process.env['CONTEXTKIT_HOME'] = dir;
  return dir;
}

function pipeStdin(body: string): void {
  const r = Readable.from([Buffer.from(body, 'utf8')]) as unknown as NodeJS.ReadStream;
  Object.defineProperty(process, 'stdin', { value: r, configurable: true });
}

describe('add command', () => {
  beforeEach(() => {
    fresh();
  });

  it('creates a context from stdin', async () => {
    pipeStdin('# Hello\n\nfrom stdin\n');
    const program = buildProgram();
    await program.parseAsync(['node', 'ck', 'add', 'my-ctx', '--stdin']);
    const parsed = await readContext('my-ctx');
    expect(parsed.body.trim()).toBe('# Hello\n\nfrom stdin'.trim());
    expect(parsed.frontmatter.name).toBe('my-ctx');
    expect(parsed.frontmatter.version).toBe(1);
    expect(parsed.frontmatter.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects invalid slugs', async () => {
    pipeStdin('x');
    const program = buildProgram();
    await expect(
      program.parseAsync(['node', 'ck', 'add', 'Bad Slug', '--stdin']),
    ).rejects.toBeDefined();
  });
});
