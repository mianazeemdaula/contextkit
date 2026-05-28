// Uses Node 20.10+ stdlib only: node:fs/promises, node:os, node:path
import { mkdir, readFile, writeFile, readdir, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CkError } from '../errors.js';
import {
  parse,
  serialize,
  type ContextFrontmatter,
  type ParsedContext,
} from './frontmatter.js';

/** Return the root storage directory ($CONTEXTKIT_HOME or ~/.contextkit). */
export function home(): string {
  const override = process.env['CONTEXTKIT_HOME'];
  if (override && override.length > 0) return override;
  return join(homedir(), '.contextkit');
}

/** Directory holding all context markdown files. */
export function contextsDir(): string {
  return join(home(), 'contexts');
}

/** Directory holding per-context version snapshots. */
export function versionsDir(): string {
  return join(home(), 'versions');
}

/** Directory holding cached template markdown files. */
export function templatesCacheDir(): string {
  return join(home(), 'templates');
}

/** Absolute path to a context file for the given slug. */
export function contextPath(slug: string): string {
  return join(contextsDir(), `${slug}.md`);
}

/** Ensure all baseline directories exist. Idempotent. */
export async function ensureLayout(): Promise<void> {
  await mkdir(home(), { recursive: true });
  await mkdir(contextsDir(), { recursive: true });
  await mkdir(versionsDir(), { recursive: true });
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

/** Read raw markdown source for a context, including frontmatter. */
export async function readContextRaw(slug: string): Promise<string> {
  const p = contextPath(slug);
  if (!(await exists(p))) {
    throw new CkError('EUSER', `context "${slug}" not found`);
  }
  return readFile(p, 'utf8');
}

/**
 * Write a context with auto-bumped version and updatedAt, then write a snapshot
 * into versions/<slug>/<iso>.md. Returns the new frontmatter.
 */
export async function writeContext(
  slug: string,
  frontmatter: Partial<ContextFrontmatter> & { name?: string },
  body: string,
): Promise<ContextFrontmatter> {
  await ensureLayout();
  const existingVersion = await currentVersion(slug);
  const merged: ContextFrontmatter = {
    name: frontmatter.name ?? slug,
    version: existingVersion + 1,
    updatedAt: new Date().toISOString(),
  };
  if (frontmatter.description !== undefined) merged.description = frontmatter.description;
  if (frontmatter.tags !== undefined) merged.tags = frontmatter.tags;
  for (const [k, v] of Object.entries(frontmatter)) {
    if (k === 'version' || k === 'updatedAt') continue;
    if (!(k in merged)) merged[k] = v;
  }
  const out = serialize({ frontmatter: merged, body });
  await writeFile(contextPath(slug), out, 'utf8');
  await snapshot(slug, out);
  return merged;
}

async function currentVersion(slug: string): Promise<number> {
  try {
    const parsed = await readContext(slug);
    return parsed.frontmatter.version ?? 0;
  } catch {
    return 0;
  }
}

/** List every saved context, sorted alphabetically by slug. */
export async function listContexts(): Promise<
  Array<{ slug: string; frontmatter: ContextFrontmatter }>
> {
  await ensureLayout();
  const entries = await readdir(contextsDir());
  const out: Array<{ slug: string; frontmatter: ContextFrontmatter }> = [];
  for (const e of entries.sort()) {
    if (!e.endsWith('.md')) continue;
    const slug = e.slice(0, -3);
    try {
      const parsed = await readContext(slug);
      out.push({ slug, frontmatter: parsed.frontmatter });
    } catch {
      // skip unreadable files
    }
  }
  return out;
}

/** Delete a context file. Version history is preserved. */
export async function deleteContext(slug: string): Promise<void> {
  const p = contextPath(slug);
  if (!(await exists(p))) {
    throw new CkError('EUSER', `context "${slug}" not found`);
  }
  await rm(p);
}

/** Write a timestamped snapshot of raw markdown into versions/<slug>/. */
export async function snapshot(slug: string, raw: string): Promise<string> {
  const dir = join(versionsDir(), slug);
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(dir, `${stamp}.md`);
  await writeFile(path, raw, 'utf8');
  return path;
}
