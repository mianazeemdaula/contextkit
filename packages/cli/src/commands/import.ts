import type { Command } from 'commander';
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parse } from '../lib/frontmatter.js';
import { slugify, isValidSlug } from '../lib/slug.js';
import { ensureLayout, readContext, writeContext } from '../lib/storage.js';
import { CkError } from '../errors.js';
import { success, info } from '../lib/log.js';

interface ImportOpts {
  force?: boolean;
}

/** Register `ck import <path>` on the program. */
export function register(program: Command): void {
  program
    .command('import <path>')
    .description('import a .ctx file or a directory of .ctx files')
    .option('--force', 'overwrite existing contexts with the same slug')
    .action((path: string, opts: ImportOpts) => handler(path, opts));
}

async function handler(path: string, opts: ImportOpts): Promise<void> {
  await ensureLayout();
  const files = await collectCtxFiles(path);
  if (files.length === 0) {
    throw new CkError('EUSER', `no .ctx files found at "${path}"`);
  }
  let imported = 0;
  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const parsed = parse(raw);
    let slug = parsed.frontmatter.slug;
    if (!slug || !isValidSlug(slug)) {
      const base = basename(file).replace(/\.ctx$/, '');
      slug = isValidSlug(base) ? base : slugify(parsed.frontmatter.name || base);
    }
    if (!opts.force) {
      const existing = await safeRead(slug);
      if (existing) {
        info(`skipped "${slug}" (already exists; use --force to overwrite)`);
        continue;
      }
    }
    const fields: Parameters<typeof writeContext>[1] = {
      name: parsed.frontmatter.name || slug,
      tags: parsed.frontmatter.tags,
      pinned: parsed.frontmatter.pinned,
      prependNewline: parsed.frontmatter.prependNewline,
      appendNewline: parsed.frontmatter.appendNewline,
      wrapInXml: parsed.frontmatter.wrapInXml,
      xmlTag: parsed.frontmatter.xmlTag,
    };
    if (parsed.frontmatter.folder !== undefined) fields.folder = parsed.frontmatter.folder;
    if (parsed.frontmatter.description !== undefined)
      fields.description = parsed.frontmatter.description;
    await writeContext(slug, fields, parsed.body);
    success(`imported "${slug}"`);
    imported += 1;
  }
  info(`imported ${imported} context${imported === 1 ? '' : 's'}`);
}

async function safeRead(slug: string): Promise<boolean> {
  try {
    await readContext(slug);
    return true;
  } catch {
    return false;
  }
}

async function collectCtxFiles(path: string): Promise<string[]> {
  const s = await stat(path).catch(() => null);
  if (!s) throw new CkError('EUSER', `path not found: ${path}`);
  if (s.isFile()) return path.endsWith('.ctx') ? [path] : [];
  const entries = await readdir(path);
  return entries.filter((e) => e.endsWith('.ctx')).map((e) => join(path, e));
}
