import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import {
  writeContext,
  readContext,
  listContexts,
  versionsDir,
  ensureLayout,
} from './storage.js';

function freshHome(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ck-test-'));
  process.env['CONTEXTKIT_HOME'] = dir;
  return dir;
}

describe('storage', () => {
  let dir: string;
  beforeEach(() => {
    dir = freshHome();
  });

  it('writes, reads, and bumps version', async () => {
    await ensureLayout();
    const fm1 = await writeContext('foo', { name: 'foo', description: 'first' }, 'body 1');
    expect(fm1.version).toBe(1);
    const fm2 = await writeContext('foo', { name: 'foo' }, 'body 2');
    expect(fm2.version).toBe(2);
    const back = await readContext('foo');
    expect(back.body.trim()).toBe('body 2');
    expect(back.frontmatter.version).toBe(2);
  });

  it('lists contexts', async () => {
    await writeContext('a', { name: 'a' }, 'A');
    await writeContext('b', { name: 'b' }, 'B');
    const items = await listContexts();
    expect(items.map((i) => i.slug)).toEqual(['a', 'b']);
  });

  it('writes a snapshot per save', async () => {
    await writeContext('snap', { name: 'snap' }, 'one');
    await writeContext('snap', { name: 'snap' }, 'two');
    const versions = await readdir(join(versionsDir(), 'snap'));
    expect(versions.length).toBe(2);
    rmSync(dir, { recursive: true, force: true });
  });
});
