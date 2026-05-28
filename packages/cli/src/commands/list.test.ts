import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProgram } from '../cli.js';
import { writeContext } from '../lib/storage.js';

function fresh(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ck-list-'));
  process.env['CONTEXTKIT_HOME'] = dir;
  return dir;
}

describe('list command', () => {
  beforeEach(() => {
    fresh();
  });

  it('says "no contexts yet" when empty', async () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await buildProgram().parseAsync(['node', 'ck', 'list']);
    const out = spy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toMatch(/no contexts yet/);
    spy.mockRestore();
  });

  it('lists contexts as JSON', async () => {
    await writeContext('alpha', { name: 'alpha', description: 'A' }, 'body');
    await writeContext('beta', { name: 'beta' }, 'body');
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await buildProgram().parseAsync(['node', 'ck', 'list', '--json']);
    const out = spy.mock.calls.map((c) => String(c[0])).join('');
    spy.mockRestore();
    const parsed = JSON.parse(out) as Array<{ slug: string }>;
    expect(parsed.map((p) => p.slug)).toEqual(['alpha', 'beta']);
  });
});
