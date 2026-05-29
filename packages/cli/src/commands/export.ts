import type { Command } from 'commander';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { assertSlug } from '../lib/slug.js';
import { listContexts, readContextRaw } from '../lib/storage.js';
import { CkError } from '../errors.js';
import { success, info } from '../lib/log.js';

interface ExportOpts {
  id?: string;
}

/** Register `ck export <dir>` on the program. */
export function register(program: Command): void {
  program
    .command('export <dir>')
    .description('export contexts as .ctx files into a directory')
    .option('--id <slug>', 'export a single context by slug')
    .action((dir: string, opts: ExportOpts) => handler(dir, opts));
}

async function handler(dir: string, opts: ExportOpts): Promise<void> {
  const out = resolve(dir);
  await mkdir(out, { recursive: true });

  if (opts.id) {
    assertSlug(opts.id);
    const raw = await readContextRaw(opts.id);
    await writeFile(join(out, `${opts.id}.ctx`), raw, 'utf8');
    success(`exported "${opts.id}" to ${out}`);
    return;
  }

  const items = await listContexts();
  if (items.length === 0) {
    throw new CkError('EUSER', 'no contexts to export');
  }
  for (const { slug } of items) {
    const raw = await readContextRaw(slug);
    await writeFile(join(out, `${slug}.ctx`), raw, 'utf8');
  }
  info(`exported ${items.length} context${items.length === 1 ? '' : 's'} to ${out}`);
}
