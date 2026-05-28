import type { Command } from 'commander';
import { ensureLayout, home } from '../lib/storage.js';
import { configPath, loadConfig, saveConfig, defaultConfig } from '../lib/config.js';
import { stat } from 'node:fs/promises';
import { success, info } from '../lib/log.js';

/** Register `ck init` on the program. */
export function register(program: Command): void {
  program
    .command('init')
    .description('create ~/.contextkit/ and a default config.json (idempotent)')
    .action(handler);
}

async function handler(): Promise<void> {
  const existedBefore = await pathExists(configPath());
  await ensureLayout();
  if (!existedBefore) {
    await saveConfig(defaultConfig());
    success(`initialized contextkit at ${home()}`);
    return;
  }
  await loadConfig();
  info(`contextkit already initialized at ${home()}`);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
