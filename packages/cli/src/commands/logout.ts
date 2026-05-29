import type { Command } from 'commander';
import { clearAuth } from '../lib/auth.js';
import { info, success } from '../lib/log.js';

/** Register `ck logout` on the program. */
export function register(program: Command): void {
  program
    .command('logout')
    .description('remove the saved auth token')
    .action(handler);
}

async function handler(): Promise<void> {
  const removed = await clearAuth();
  if (removed) success('logged out');
  else info('already logged out');
}
