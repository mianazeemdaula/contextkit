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
import type { ContextFrontmatter } from '../lib/frontmatter.js';

interface AddOpts {
  template?: string;
  from?: string;
  tags?: string;
  folder?: string;
  pin?: boolean;
  wrap?: boolean;
  stdin?: boolean;
  force?: boolean;
}

/** Register `ck add <slug>` on the program. */
export function register(program: Command): void {
  program
    .command('add <slug>')
    .description('create a new context, optionally seeded from a template or stdin')
    .option('--template <name>', 'seed body from a bundled template name')
    .option('--from <template>', 'alias for --template')
    .option('--tags <t1,t2>', 'comma-separated tags')
    .option('--folder <path>', 'folder path e.g. work/clients')
    .option('--pin', 'mark the context as pinned')
    .option('--wrap', 'auto-wrap content in <context> XML tags on inject')
    .option('--stdin', 'read body from stdin instead of opening an editor')
    .option('--force', 'overwrite existing context')
    .action((slug: string, opts: AddOpts) => handler(slug, opts));
}

function parseTags(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  const tags = raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return tags.length > 0 ? tags : undefined;
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
  let seedTags: string[] | undefined;
  const templateName = opts.template ?? opts.from;

  if (templateName) {
    const tpl = await readBundledTemplate(templateName);
    const parsed = parse(tpl);
    seedBody = parsed.body;
    if (parsed.frontmatter.tags.length > 0) seedTags = parsed.frontmatter.tags;
  } else {
    seedBody = `# ${slug}\n\nWrite your context here.\n`;
  }

  const fields: Partial<ContextFrontmatter> & { name: string } = { name: slug };
  const tags = parseTags(opts.tags) ?? seedTags;
  if (tags !== undefined) fields.tags = tags;
  if (opts.folder !== undefined) fields.folder = opts.folder;
  if (opts.pin) fields.pinned = true;
  if (opts.wrap) fields.wrapInXml = true;

  if (opts.stdin) {
    const stdinBody = await readStdin();
    if (stdinBody.length > 0) seedBody = stdinBody;
    await writeContext(slug, fields, seedBody);
    success(`created ${path}`);
    return;
  }

  await writeContext(slug, fields, seedBody);
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
  const tplPath = join(here, '..', '..', 'templates', `${name}.ctx`);
  try {
    return await readFile(tplPath, 'utf8');
  } catch {
    throw new CkError('EUSER', `template "${name}" not found`);
  }
}
