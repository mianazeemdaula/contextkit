import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProgram } from '../cli.js';
import { configPath } from '../lib/config.js';
import { contextsDir, versionsDir } from '../lib/storage.js';

function fresh(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ck-init-'));
  process.env['CONTEXTKIT_HOME'] = dir;
  return dir;
}

describe('init command', () => {
  beforeEach(() => {
    fresh();
  });

  it('creates directories and config', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'ck', 'init']);
    expect(existsSync(configPath())).toBe(true);
    expect(existsSync(contextsDir())).toBe(true);
    expect(existsSync(versionsDir())).toBe(true);
  });

  it('is idempotent', async () => {
    const program1 = buildProgram();
    await program1.parseAsync(['node', 'ck', 'init']);
    const program2 = buildProgram();
    await expect(program2.parseAsync(['node', 'ck', 'init'])).resolves.not.toThrow();
  });
});
