import type { Command } from 'commander';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSlug } from '../lib/slug.js';
import { contextPath, ensureLayout, readContext } from '../lib/storage.js';
import { CkError } from '../errors.js';
import { info, success } from '../lib/log.js';

interface UseOpts {
  as?: string;
}

interface ListOpts {
  json?: boolean;
}

/** Register the `ck template` command group on the program. */
export function register(program: Command): void {
  const tpl = program.command('template').description('manage bundled context templates');

  tpl
    .command('list')
    .description('list bundled templates')
    .option('--json', 'output as JSON')
    .action((opts: ListOpts) => listHandler(opts));

  tpl
    .command('use <name>')
    .description('copy a bundled template into your contexts/')
    .option('--as <slug>', 'save under this slug instead of the template name')
    .action((name: string, opts: UseOpts) => useHandler(name, opts));
}

function bundledDir(): string {
  const here = fileURLToPath(new URL('.', import.meta.url));
  return join(here, '..', '..', 'templates');
}

async function listHandler(opts: ListOpts): Promise<void> {
  const dir = bundledDir();
  const entries = (await readdir(dir)).filter((e) => e.endsWith('.md')).sort();
  const names = entries.map((e) => e.slice(0, -3));
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(names, null, 2)}\n`);
    return;
  }
  if (names.length === 0) {
    info('no bundled templates found');
    return;
  }
  for (const n of names) info(n);
}

async function useHandler(name: string, opts: UseOpts): Promise<void> {
  const slug = opts.as ?? name;
  assertSlug(slug);
  await ensureLayout();
  try {
    await readContext(slug);
    throw new CkError('EUSER', `context "${slug}" already exists`);
  } catch (e) {
    if (e instanceof CkError && e.message.includes('already exists')) throw e;
    // not-found is fine
  }
  const src = join(bundledDir(), `${name}.md`);
  let raw: string;
  try {
    raw = await readFile(src, 'utf8');
  } catch {
    throw new CkError('EUSER', `template "${name}" not found`);
  }
  await writeFile(contextPath(slug), raw, 'utf8');
  success(`installed template "${name}" as "${slug}"`);
}
