import type { Command } from 'commander';
import { createInterface } from 'node:readline';
import { assertSlug } from '../lib/slug.js';
import { deleteContext } from '../lib/storage.js';
import { CkError } from '../errors.js';
import { success } from '../lib/log.js';

interface RmOpts {
  yes?: boolean;
  force?: boolean;
}

/** Register `ck delete <slug>` (aliases: rm, remove) on the program. */
export function register(program: Command): void {
  program
    .command('delete <slug>')
    .alias('rm')
    .alias('remove')
    .description('delete a context (moved to trash; version history is preserved)')
    .option('-y, --yes', 'skip confirmation prompt')
    .option('-f, --force', 'skip confirmation prompt')
    .action((slug: string, opts: RmOpts) => handler(slug, opts));
}

async function handler(slug: string, opts: RmOpts): Promise<void> {
  assertSlug(slug);
  if (!opts.yes && !opts.force) {
    const ok = await confirm(`delete context "${slug}"? [y/N] `);
    if (!ok) throw new CkError('EUSER', 'aborted');
  }
  await deleteContext(slug);
  success(`deleted "${slug}"`);
}

function confirm(prompt: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (ans) => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans.trim()));
    });
  });
}
