import type { Command } from 'commander';
import { loadAuth, saveAuth } from '../lib/auth.js';
import { info, success } from '../lib/log.js';

/** Register `ck token <print|set>` on the program. */
export function register(program: Command): void {
  const token = program.command('token').description('inspect or replace the saved auth token');

  token
    .command('print')
    .description('print the current token (or "not logged in")')
    .action(async () => {
      const auth = await loadAuth();
      if (!auth) {
        info('not logged in');
        return;
      }
      process.stdout.write(`${auth.token}\n`);
    });

  token
    .command('set <token>')
    .description('write a token directly without the browser flow')
    .action(async (value: string) => {
      await saveAuth(value);
      success('token saved');
    });
}
