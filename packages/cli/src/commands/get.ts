import type { Command } from 'commander';
import { assertSlug } from '../lib/slug.js';
import { readContext, readContextRaw } from '../lib/storage.js';

interface GetOpts {
  raw?: boolean;
  metadata?: boolean;
}

/** Register `ck get <slug>` on the program. */
export function register(program: Command): void {
  program
    .command('get <slug>')
    .description('print the body of a context to stdout')
    .option('--raw', 'include YAML frontmatter')
    .option('--metadata', 'include the frontmatter header (alias for --raw)')
    .action((slug: string, opts: GetOpts) => handler(slug, opts));
}

async function handler(slug: string, opts: GetOpts): Promise<void> {
  assertSlug(slug);
  if (opts.raw || opts.metadata) {
    const raw = await readContextRaw(slug);
    process.stdout.write(raw.endsWith('\n') ? raw : `${raw}\n`);
    return;
  }
  const parsed = await readContext(slug);
  process.stdout.write(parsed.body.endsWith('\n') ? parsed.body : `${parsed.body}\n`);
}
