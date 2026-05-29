import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authPath, clearAuth, loadAuth, saveAuth } from './auth.js';

function fresh(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ck-auth-'));
  process.env['CONTEXTKIT_HOME'] = dir;
  return dir;
}

describe('auth', () => {
  beforeEach(() => {
    fresh();
  });

  it('returns null when auth.json is missing', async () => {
    expect(await loadAuth()).toBeNull();
  });

  it('writes and reads a token round-trip', async () => {
    const saved = await saveAuth('tok-abc');
    expect(saved.token).toBe('tok-abc');
    expect(existsSync(authPath())).toBe(true);
    const loaded = await loadAuth();
    expect(loaded?.token).toBe('tok-abc');
    expect(typeof loaded?.savedAt).toBe('string');
  });

  it('clearAuth deletes the file and is idempotent', async () => {
    await saveAuth('t');
    expect(await clearAuth()).toBe(true);
    expect(existsSync(authPath())).toBe(false);
    expect(await clearAuth()).toBe(false);
  });

  it('treats an empty token as logged-out', async () => {
    await saveAuth('');
    expect(await loadAuth()).toBeNull();
  });
});
