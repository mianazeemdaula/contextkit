import type { Command } from 'commander';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadConfig } from '../lib/config.js';
import {
  listContexts,
  readContext,
  writeContext,
  deleteContext,
  buildInjection,
  metrics,
} from '../lib/storage.js';
import { slugify } from '../lib/slug.js';
import type { ContextFrontmatter } from '../lib/frontmatter.js';
import { info } from '../lib/log.js';

interface ServeOpts {
  port?: string;
}

/** Register `ck serve` on the program. */
export function register(program: Command): void {
  program
    .command('serve')
    .description('start the local API server for the web app and browser extension')
    .option('--port <port>', 'override the configured port (default 7842)')
    .action((opts: ServeOpts) => handler(opts));
}

/** Full context DTO returned by the local API (spec §3.1 + computed fields). */
function toDto(fm: ContextFrontmatter, body: string) {
  const { wordCount, tokenEstimate } = metrics(body);
  return {
    id: fm.id,
    slug: fm.slug,
    name: fm.name,
    content: body,
    format: 'markdown' as const,
    tags: fm.tags,
    folder: fm.folder,
    pinned: fm.pinned,
    prependNewline: fm.prependNewline,
    appendNewline: fm.appendNewline,
    wrapInXml: fm.wrapInXml,
    xmlTag: fm.xmlTag,
    version: fm.version,
    wordCount,
    tokenEstimate,
    createdAt: fm.createdAt,
    updatedAt: fm.updatedAt,
  };
}

function send(res: ServerResponse, status: number, body?: unknown): void {
  res.statusCode = status;
  if (body === undefined) {
    res.end();
    return;
  }
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.from(c));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.trim().length === 0) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * Build the request handler. Bound to 127.0.0.1 only. Requires the shared
 * X-ContextKit-Token header when a local token is configured (spec §11.1).
 */
export function buildHandler(token?: string) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      if (token && req.headers['x-contextkit-token'] !== token) {
        return send(res, 401, { error: 'invalid or missing X-ContextKit-Token' });
      }
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
      // expect: api / contexts / [slug] / [action]
      if (parts[0] !== 'api' || parts[1] !== 'contexts') {
        return send(res, 404, { error: 'not found' });
      }
      const slug = parts[2];
      const action = parts[3];
      const method = req.method ?? 'GET';

      if (!slug) {
        if (method === 'GET') {
          const items = await listContexts();
          const data = items.map((i) => toDto(i.frontmatter, '')).map((d) => ({
            ...d,
            content: undefined,
          }));
          return send(res, 200, { data, total: data.length });
        }
        if (method === 'POST') {
          const b = await readBody(req);
          const name = String(b['name'] ?? 'context');
          const newSlug = slugify(name);
          const fields: Partial<ContextFrontmatter> & { name: string } = { name };
          if (Array.isArray(b['tags'])) fields.tags = b['tags'].map(String);
          if (typeof b['folder'] === 'string') fields.folder = b['folder'];
          if (typeof b['pinned'] === 'boolean') fields.pinned = b['pinned'];
          const fm = await writeContext(newSlug, fields, String(b['content'] ?? ''));
          return send(res, 201, { data: toDto(fm, String(b['content'] ?? '')) });
        }
        return send(res, 405, { error: 'method not allowed' });
      }

      if (action === 'inject' || action === 'copy') {
        const parsed = await readContext(slug);
        const text = buildInjection(parsed.frontmatter, parsed.body);
        const { wordCount, tokenEstimate } = metrics(parsed.body);
        return send(res, 200, { text, wordCount, tokenEstimate });
      }

      if (method === 'GET') {
        const parsed = await readContext(slug);
        return send(res, 200, { data: toDto(parsed.frontmatter, parsed.body) });
      }
      if (method === 'PUT') {
        const b = await readBody(req);
        const current = await readContext(slug);
        const fields: Partial<ContextFrontmatter> & { name?: string } = {};
        if (typeof b['name'] === 'string') fields.name = b['name'];
        if (Array.isArray(b['tags'])) fields.tags = b['tags'].map(String);
        if (typeof b['folder'] === 'string') fields.folder = b['folder'];
        if (typeof b['pinned'] === 'boolean') fields.pinned = b['pinned'];
        if (typeof b['wrapInXml'] === 'boolean') fields.wrapInXml = b['wrapInXml'];
        const body = typeof b['content'] === 'string' ? b['content'] : current.body;
        const fm = await writeContext(slug, fields, body);
        return send(res, 200, { data: toDto(fm, body) });
      }
      if (method === 'DELETE') {
        await deleteContext(slug);
        return send(res, 204);
      }
      return send(res, 405, { error: 'method not allowed' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = msg.includes('not found') ? 404 : 500;
      return send(res, status, { error: msg });
    }
  };
}

async function handler(opts: ServeOpts): Promise<void> {
  const cfg = await loadConfig();
  const port = opts.port ? Number(opts.port) : cfg.apiServerPort;
  const server = createServer((req, res) => {
    void buildHandler(cfg.localToken)(req, res);
  });
  server.listen(port, '127.0.0.1', () => {
    info(`Local API server running at http://127.0.0.1:${port}`);
    info('CTRL+C to stop');
  });
}
