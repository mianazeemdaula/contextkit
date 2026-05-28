import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProgram } from '../cli.js';
import { writeContext } from '../lib/storage.js';
import * as clipboard from '../lib/clipboard.js';

function fresh(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ck-copy-'));
  process.env['CONTEXTKIT_HOME'] = dir;
  return dir;
}

describe('copy command', () => {
  beforeEach(() => {
    fresh();
  });

  it('invokes the clipboard with the body', async () => {
    await writeContext('hello', { name: 'hello' }, 'CLIPBOARD-BODY');
    const spy = vi.spyOn(clipboard, 'copy').mockResolvedValue(true);
    await buildProgram().parseAsync(['node', 'ck', 'copy', 'hello']);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toContain('CLIPBOARD-BODY');
    spy.mockRestore();
  });

  it('falls back to stdout when clipboard unavailable', async () => {
    await writeContext('hello', { name: 'hello' }, 'STDOUT-FALLBACK');
    vi.spyOn(clipboard, 'copy').mockResolvedValue(false);
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await buildProgram().parseAsync(['node', 'ck', 'copy', 'hello']);
    const written = out.mock.calls.map((c) => String(c[0])).join('');
    expect(written).toContain('STDOUT-FALLBACK');
    out.mockRestore();
  });
});
