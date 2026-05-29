import type { Command } from 'commander';
import { listContexts } from '../lib/storage.js';
import { info, dim } from '../lib/log.js';

interface ListOpts {
  json?: boolean;
  tag?: string;
  folder?: string;
  pinned?: boolean;
}

/** Register `ck list` on the program. */
export function register(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('list all saved contexts')
    .option('--json', 'output as JSON')
    .option('--tag <tag>', 'only contexts with this tag')
    .option('--folder <path>', 'only contexts under this folder prefix')
    .option('--pinned', 'only pinned contexts')
    .action((opts: ListOpts) => handler(opts));
}

function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

async function handler(opts: ListOpts): Promise<void> {
  let items = await listContexts();
  if (opts.tag) items = items.filter((i) => i.frontmatter.tags.includes(opts.tag as string));
  if (opts.folder) {
    items = items.filter((i) => (i.frontmatter.folder ?? '').startsWith(opts.folder as string));
  }
  if (opts.pinned) items = items.filter((i) => i.frontmatter.pinned);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(items, null, 2)}\n`);
    return;
  }
  if (items.length === 0) {
    info('no contexts yet — try `ck add <slug>`');
    return;
  }
  const idW = 8;
  const nameW = Math.max(4, ...items.map((i) => i.frontmatter.name.length));
  const tagW = Math.max(4, ...items.map((i) => i.frontmatter.tags.join(', ').length));
  info(
    `  ${'ID'.padEnd(idW)}  ${'NAME'.padEnd(nameW)}  ${'TAGS'.padEnd(tagW)}  UPDATED`,
  );
  info(`  ${'─'.repeat(idW + nameW + tagW + 18)}`);
  for (const { frontmatter } of items) {
    const id = (frontmatter.id || '').slice(0, idW).padEnd(idW);
    const name = frontmatter.name.padEnd(nameW);
    const tags = frontmatter.tags.join(', ').padEnd(tagW);
    const upd = dim(relativeTime(frontmatter.updatedAt));
    info(`  ${id}  ${name}  ${tags}  ${upd}`.trimEnd());
  }
}
