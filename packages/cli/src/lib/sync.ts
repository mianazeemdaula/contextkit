import { CkError } from '../errors.js';
import { listContexts, readContext, writeContext } from './storage.js';
import type { ContextFrontmatter } from './frontmatter.js';

/** Wire format for a single context exchanged with the sync endpoint. */
export interface SyncContext {
  slug: string;
  frontmatter: Partial<ContextFrontmatter> & { name?: string };
  body: string;
  updatedAt: string;
  version: number;
}

/** Server response to `POST /api/sync/pull`. */
export interface PullResponse {
  contexts: SyncContext[];
}

/** Server response to `POST /api/sync/push`. */
export interface PushResponse {
  accepted: string[];
  conflicts: Array<{ slug: string; reason: string; serverVersion: number }>;
}

/** Outcome of a `pullAll` run, returned to the command layer for printing. */
export interface PullResult {
  pulled: string[];
  skipped: string[];
}

/** Outcome of a `pushAll` run, returned to the command layer for printing. */
export interface PushResult {
  accepted: string[];
  conflicts: PushResponse['conflicts'];
}

/** Optional injection seam for tests — defaults to the global `fetch`. */
export interface SyncDeps {
  fetch?: typeof fetch;
}

function authHeaders(token: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };
}

/**
 * Pull every remote context newer than the local copy. Local contexts not
 * present remotely are left untouched. Throws `CkError` on network/HTTP error.
 */
export async function pullAll(
  apiBase: string,
  token: string,
  opts: { since?: string } = {},
  deps: SyncDeps = {},
): Promise<PullResult> {
  const f = deps.fetch ?? fetch;
  const body: Record<string, string> = {};
  if (opts.since) body['since'] = opts.since;
  let res: Response;
  try {
    res = await f(`${apiBase}/api/sync/pull`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new CkError('ESYS', `pull request failed: ${(e as Error).message}`);
  }
  if (!res.ok) {
    throw new CkError('ESYS', `pull failed with HTTP ${res.status}`);
  }
  const payload = (await res.json()) as PullResponse;
  const pulled: string[] = [];
  const skipped: string[] = [];
  for (const c of payload.contexts) {
    const localVersion = await safeLocalVersion(c.slug);
    if (localVersion !== null && localVersion >= c.version) {
      skipped.push(c.slug);
      continue;
    }
    await writeContext(c.slug, { ...c.frontmatter, name: c.frontmatter.name ?? c.slug }, c.body);
    pulled.push(c.slug);
  }
  return { pulled, skipped };
}

/**
 * Push every local context to the server. If the server reports conflicts and
 * `force` is false, conflicts are returned to the caller. With `force: true`
 * the conflicting contexts are re-sent with a `force: true` marker.
 */
export async function pushAll(
  apiBase: string,
  token: string,
  opts: { force?: boolean } = {},
  deps: SyncDeps = {},
): Promise<PushResult> {
  const f = deps.fetch ?? fetch;
  const contexts: SyncContext[] = [];
  for (const item of await listContexts()) {
    const parsed = await readContext(item.slug);
    contexts.push({
      slug: item.slug,
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      updatedAt: parsed.frontmatter.updatedAt,
      version: parsed.frontmatter.version,
    });
  }
  const body: Record<string, unknown> = { contexts };
  if (opts.force === true) body['force'] = true;
  let res: Response;
  try {
    res = await f(`${apiBase}/api/sync/push`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new CkError('ESYS', `push request failed: ${(e as Error).message}`);
  }
  if (!res.ok) {
    throw new CkError('ESYS', `push failed with HTTP ${res.status}`);
  }
  const payload = (await res.json()) as PushResponse;
  return { accepted: payload.accepted, conflicts: payload.conflicts };
}

async function safeLocalVersion(slug: string): Promise<number | null> {
  try {
    const parsed = await readContext(slug);
    return parsed.frontmatter.version;
  } catch {
    return null;
  }
}
