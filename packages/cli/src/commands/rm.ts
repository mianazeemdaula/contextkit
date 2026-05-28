import type { Command } from 'commander';
import { createInterface } from 'node:readline';
import { assertSlug } from '../lib/slug.js';
import { deleteContext } from '../lib/storage.js';
import { CkError } from '../errors.js';
import { success } from '../lib/log.js';

interface RmOpts {
  yes?: boolean;
}

/** Register `ck rm <slug>` on the program. */
export function register(program: Command): void {
  program
    .command('rm <slug>')
    .alias('remove')
    .description('delete a context (version history is preserved)')
    .option('-y, --yes', 'skip confirmation prompt')
    .action((slug: string, opts: RmOpts) => handler(slug, opts));
}

async function handler(slug: string, opts: RmOpts): Promise<void> {
  assertSlug(slug);
  if (!opts.yes) {
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
