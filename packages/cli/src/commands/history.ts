import type { Command } from 'commander';
import { assertSlug } from '../lib/slug.js';
import { readContext, listVersions, readVersion, writeContext } from '../lib/storage.js';
import { parse } from '../lib/frontmatter.js';
import { CkError } from '../errors.js';
import { info, success } from '../lib/log.js';

interface HistoryOpts {
  restore?: string;
  json?: boolean;
}

/** Register `ck history <slug>` on the program. */
export function register(program: Command): void {
  program
    .command('history <slug>')
    .description('show version history for a context, or restore a version')
    .option('--restore <version>', 'restore a previous version, e.g. v3 or 3')
    .option('--json', 'output as JSON')
    .action((slug: string, opts: HistoryOpts) => handler(slug, opts));
}

function parseVersion(raw: string): number {
  const n = Number(raw.replace(/^v/i, ''));
  if (!Number.isInteger(n) || n < 1) {
    throw new CkError('EUSER', `invalid version "${raw}" (expected e.g. v3 or 3)`);
  }
  return n;
}

async function handler(slug: string, opts: HistoryOpts): Promise<void> {
  assertSlug(slug);
  const current = await readContext(slug);
  const id = current.frontmatter.id;

  if (opts.restore) {
    const target = parseVersion(opts.restore);
    const raw = await readVersion(id, target);
    const restored = parse(raw);
    await writeContext(slug, current.frontmatter, restored.body);
    success(`restored "${slug}" from v${target} (saved as a new version)`);
    return;
  }

  const versions = await listVersions(id);
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(versions, null, 2)}\n`);
    return;
  }
  if (versions.length === 0) {
    info('no version history yet');
    return;
  }
  for (const v of versions) {
    const marker = v === current.frontmatter.version ? ' (current)' : '';
    info(`  v${v}${marker}`);
  }
}
