// Uses Node 20.10+ stdlib only: node:fs/promises, node:os, node:path, node:crypto
import { mkdir, readFile, writeFile, readdir, rename, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CkError } from '../errors.js';
import { wordCount, estimateTokens } from './slug.js';
import {
  parse,
  serialize,
  defaultFlags,
  type ContextFrontmatter,
  type ParsedContext,
} from './frontmatter.js';

/** Return the root storage directory ($CONTEXTKIT_HOME or ~/.contextkit). */
export function home(): string {
  const override = process.env['CONTEXTKIT_HOME'];
  if (override && override.length > 0) return override;
  return join(homedir(), '.contextkit');
}

/** Directory holding all `.ctx` context files. */
export function contextsDir(): string {
  return join(home(), 'contexts');
}

/** Directory holding per-context version snapshots (history/<id>/vN.ctx). */
export function versionsDir(): string {
  return join(home(), 'history');
}

/** Directory holding soft-deleted contexts (30-day retention, spec §10.1). */
export function trashDir(): string {
  return join(home(), 'trash');
}

/** Directory holding cached template `.ctx` files. */
export function templatesCacheDir(): string {
  return join(home(), 'templates');
}

/** Absolute path to a context file for the given slug. */
export function contextPath(slug: string): string {
  return join(contextsDir(), `${slug}.ctx`);
}

/** Ensure all baseline directories exist. Idempotent. */
export async function ensureLayout(): Promise<void> {
  await mkdir(home(), { recursive: true });
  await mkdir(contextsDir(), { recursive: true });
  await mkdir(versionsDir(), { recursive: true });
  await mkdir(trashDir(), { recursive: true });
  await mkdir(templatesCacheDir(), { recursive: true });
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Read and parse a context by slug. Throws EUSER if not found. */
export async function readContext(slug: string): Promise<ParsedContext> {
  const p = contextPath(slug);
  if (!(await exists(p))) {
    throw new CkError('EUSER', `context "${slug}" not found`);
  }
  const raw = await readFile(p, 'utf8');
  return parse(raw);
}

/** Read raw `.ctx` source for a context, including frontmatter. */
export async function readContextRaw(slug: string): Promise<string> {
  const p = contextPath(slug);
  if (!(await exists(p))) {
    throw new CkError('EUSER', `context "${slug}" not found`);
  }
  return readFile(p, 'utf8');
}

/**
 * Write a context with auto-bumped version and timestamps, preserving stable
 * id/createdAt across rewrites, then snapshot into history/<id>/v<version>.ctx.
 * Uses an atomic write (write to .tmp then rename). Returns the new frontmatter.
 */
export async function writeContext(
  slug: string,
  fields: Partial<ContextFrontmatter> & { name?: string },
  body: string,
): Promise<ContextFrontmatter> {
  await ensureLayout();
  const existing = await safeRead(slug);
  const now = new Date().toISOString();
  const flags = defaultFlags();
  const merged: ContextFrontmatter = {
    id: existing?.frontmatter.id || fields.id || randomUUID(),
    slug,
    name: fields.name ?? existing?.frontmatter.name ?? slug,
    tags: fields.tags ?? existing?.frontmatter.tags ?? flags.tags,
    pinned: fields.pinned ?? existing?.frontmatter.pinned ?? flags.pinned,
    prependNewline:
      fields.prependNewline ?? existing?.frontmatter.prependNewline ?? flags.prependNewline,
    appendNewline:
      fields.appendNewline ?? existing?.frontmatter.appendNewline ?? flags.appendNewline,
    wrapInXml: fields.wrapInXml ?? existing?.frontmatter.wrapInXml ?? flags.wrapInXml,
    xmlTag: fields.xmlTag ?? existing?.frontmatter.xmlTag ?? flags.xmlTag,
    version: (existing?.frontmatter.version ?? 0) + 1,
    createdAt: existing?.frontmatter.createdAt || now,
    updatedAt: now,
  };
  const folder = fields.folder ?? existing?.frontmatter.folder;
  if (folder !== undefined) merged.folder = folder;
  const description = fields.description ?? existing?.frontmatter.description;
  if (description !== undefined) merged.description = description;

  const out = serialize({ frontmatter: merged, body });
  await atomicWrite(contextPath(slug), out);
  await snapshot(merged.id, merged.version, out);
  return merged;
}

async function safeRead(slug: string): Promise<ParsedContext | null> {
  try {
    return await readContext(slug);
  } catch {
    return null;
  }
}

async function atomicWrite(path: string, data: string): Promise<void> {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, data, 'utf8');
  await rename(tmp, path);
}

/** List every saved context, sorted alphabetically by slug. */
export async function listContexts(): Promise<
  Array<{ slug: string; frontmatter: ContextFrontmatter }>
> {
  await ensureLayout();
  const entries = await readdir(contextsDir());
  const out: Array<{ slug: string; frontmatter: ContextFrontmatter }> = [];
  for (const e of entries.sort()) {
    if (!e.endsWith('.ctx')) continue;
    const slug = e.slice(0, -4);
    try {
      const parsed = await readContext(slug);
      out.push({ slug, frontmatter: parsed.frontmatter });
    } catch {
      // skip unreadable files
    }
  }
  return out;
}

/** Soft-delete a context by moving it into trash/. Version history is kept. */
export async function deleteContext(slug: string): Promise<void> {
  const p = contextPath(slug);
  if (!(await exists(p))) {
    throw new CkError('EUSER', `context "${slug}" not found`);
  }
  await mkdir(trashDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await rename(p, join(trashDir(), `${slug}.${stamp}.ctx`));
}

/** Write a versioned snapshot of raw `.ctx` text into history/<id>/v<version>.ctx. */
export async function snapshot(id: string, version: number, raw: string): Promise<string> {
  const dir = join(versionsDir(), id);
  await mkdir(dir, { recursive: true });
  const path = join(dir, `v${version}.ctx`);
  await writeFile(path, raw, 'utf8');
  return path;
}

/** List version snapshots for a context id, newest first. */
export async function listVersions(id: string): Promise<number[]> {
  const dir = join(versionsDir(), id);
  try {
    const entries = await readdir(dir);
    return entries
      .filter((e) => /^v\d+\.ctx$/.test(e))
      .map((e) => Number(e.slice(1, -4)))
      .sort((a, b) => b - a);
  } catch {
    return [];
  }
}

/** Read the raw `.ctx` content of a specific version snapshot. */
export async function readVersion(id: string, version: number): Promise<string> {
  const path = join(versionsDir(), id, `v${version}.ctx`);
  if (!(await exists(path))) {
    throw new CkError('EUSER', `version v${version} not found`);
  }
  return readFile(path, 'utf8');
}

/** Computed token/word metrics for a context body. */
export function metrics(body: string): { wordCount: number; tokenEstimate: number } {
  return { wordCount: wordCount(body), tokenEstimate: estimateTokens(body) };
}

/**
 * Build the final injection string for a context, applying its behaviour flags
 * (wrap in XML, prepend/append newline) as described in spec §8.1.
 */
export function buildInjection(fm: ContextFrontmatter, body: string): string {
  let text = body.replace(/\n+$/, '');
  if (fm.wrapInXml) {
    const tag = fm.xmlTag || 'context';
    text = `<${tag}>\n${text}\n</${tag}>`;
  }
  if (fm.prependNewline) text = `\n${text}`;
  if (fm.appendNewline) text = `${text}\n`;
  return text;
}

