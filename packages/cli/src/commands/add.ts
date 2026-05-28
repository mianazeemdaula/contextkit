import type { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSlug } from '../lib/slug.js';
import { contextPath, ensureLayout, writeContext, readContext } from '../lib/storage.js';
import { openEditor } from '../lib/editor.js';
import { CkError } from '../errors.js';
import { success } from '../lib/log.js';
import { parse } from '../lib/frontmatter.js';

interface AddOpts {
  from?: string;
  stdin?: boolean;
  force?: boolean;
}

/** Register `ck add <slug>` on the program. */
export function register(program: Command): void {
  program
    .command('add <slug>')
    .description('create a new context, optionally seeded from a template or stdin')
    .option('--from <template>', 'seed body from a bundled template name')
    .option('--stdin', 'read body from stdin instead of opening an editor')
    .option('--force', 'overwrite existing context')
    .action((slug: string, opts: AddOpts) => handler(slug, opts));
}

async function handler(slug: string, opts: AddOpts): Promise<void> {
  assertSlug(slug);
  await ensureLayout();
  const path = contextPath(slug);

  if (!opts.force) {
    try {
      await readContext(slug);
      throw new CkError('EUSER', `context "${slug}" already exists (use --force to overwrite)`);
    } catch (e) {
      if (e instanceof CkError && e.message.includes('already exists')) throw e;
      // not-found is fine, continue
    }
  }

  let seedBody = '';
  let seedDescription: string | undefined;
  let seedTags: string[] | undefined;

  if (opts.from) {
    const tpl = await readBundledTemplate(opts.from);
    const parsed = parse(tpl);
    seedBody = parsed.body;
    if (parsed.frontmatter.description) seedDescription = parsed.frontmatter.description;
    if (parsed.frontmatter.tags) seedTags = parsed.frontmatter.tags;
  } else {
    seedBody = `# ${slug}\n\nWrite your context here.\n`;
  }

  if (opts.stdin) {
    const stdinBody = await readStdin();
    if (stdinBody.length > 0) seedBody = stdinBody;
    const fm: Parameters<typeof writeContext>[1] = { name: slug };
    if (seedDescription !== undefined) fm.description = seedDescription;
    if (seedTags !== undefined) fm.tags = seedTags;
    await writeContext(slug, fm, seedBody);
    success(`created ${path}`);
    return;
  }

  const fm: Parameters<typeof writeContext>[1] = { name: slug };
  if (seedDescription !== undefined) fm.description = seedDescription;
  if (seedTags !== undefined) fm.tags = seedTags;
  await writeContext(slug, fm, seedBody);
  openEditor(path);
  const after = await readContext(slug);
  await writeContext(slug, after.frontmatter, after.body);
  success(`saved ${path}`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString('utf8');
}

async function readBundledTemplate(name: string): Promise<string> {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const tplPath = join(here, '..', '..', 'templates', `${name}.md`);
  try {
    return await readFile(tplPath, 'utf8');
  } catch {
    throw new CkError('EUSER', `template "${name}" not found`);
  }
}
