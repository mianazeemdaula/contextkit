import type { Command } from 'commander';
import { listContexts } from '../lib/storage.js';
import { info, dim } from '../lib/log.js';

interface ListOpts {
  json?: boolean;
}

/** Register `ck list` on the program. */
export function register(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('list all saved contexts')
    .option('--json', 'output as JSON')
    .action((opts: ListOpts) => handler(opts));
}

async function handler(opts: ListOpts): Promise<void> {
  const items = await listContexts();
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
    return;
  }
  if (items.length === 0) {
    info('no contexts yet — try `ck add <slug>`');
    return;
  }
  const widest = Math.max(...items.map((i) => i.slug.length));
  for (const { slug, frontmatter } of items) {
    const desc = frontmatter.description ?? '';
    const upd = frontmatter.updatedAt ?? '';
    info(`${slug.padEnd(widest)}  ${desc}  ${dim(upd)}`.trimEnd());
  }
}
