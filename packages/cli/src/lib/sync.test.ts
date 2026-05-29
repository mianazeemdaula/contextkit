import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeContext } from './storage.js';
import { pullAll, pushAll, type PullResponse, type PushResponse } from './sync.js';

function fresh(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ck-sync-'));
  process.env['CONTEXTKIT_HOME'] = dir;
  return dir;
}

interface RecordedCall {
  url: string;
  init: RequestInit;
}

function mockFetch(response: unknown, status = 200): { fn: typeof fetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(response), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe('pullAll', () => {
  beforeEach(() => {
    fresh();
  });

  it('POSTs to /api/sync/pull with bearer token and writes returned contexts', async () => {
    const payload: PullResponse = {
      contexts: [
        {
          slug: 'alpha',
          frontmatter: { name: 'alpha', version: 3, updatedAt: '2026-01-01T00:00:00.000Z' },
          body: 'remote body',
          updatedAt: '2026-01-01T00:00:00.000Z',
          version: 3,
        },
      ],
    };
    const { fn, calls } = mockFetch(payload);
    const result = await pullAll('https://x.test', 'tok-123', { since: '2025-01-01' }, { fetch: fn });
    expect(result.pulled).toEqual(['alpha']);
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.url).toBe('https://x.test/api/sync/pull');
    expect(call.init.method).toBe('POST');
    const headers = call.init.headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer tok-123');
    expect(JSON.parse(String(call.init.body))).toEqual({ since: '2025-01-01' });
  });

  it('skips when local version >= remote version', async () => {
    await writeContext('a', { name: 'a' }, 'local'); // version 1
    const { fn } = mockFetch({
      contexts: [
        {
          slug: 'a',
          frontmatter: { name: 'a', version: 1, updatedAt: '2026-01-01T00:00:00.000Z' },
          body: 'remote',
          updatedAt: '2026-01-01T00:00:00.000Z',
          version: 1,
        },
      ],
    } satisfies PullResponse);
    const result = await pullAll('https://x.test', 't', {}, { fetch: fn });
    expect(result.skipped).toEqual(['a']);
    expect(result.pulled).toEqual([]);
  });

  it('throws on non-2xx response', async () => {
    const { fn } = mockFetch({ error: 'nope' }, 500);
    await expect(pullAll('https://x.test', 't', {}, { fetch: fn })).rejects.toThrow(/HTTP 500/);
  });
});

describe('pushAll', () => {
  beforeEach(() => {
    fresh();
  });

  it('POSTs every local context to /api/sync/push', async () => {
    await writeContext('one', { name: 'one' }, 'body one');
    await writeContext('two', { name: 'two' }, 'body two');
    const { fn, calls } = mockFetch({ accepted: ['one', 'two'], conflicts: [] } satisfies PushResponse);
    const result = await pushAll('https://x.test', 'tok', {}, { fetch: fn });
    expect(result.accepted).toEqual(['one', 'two']);
    expect(result.conflicts).toEqual([]);
    const body = JSON.parse(String(calls[0]!.init.body)) as { contexts: Array<{ slug: string }> };
    expect(body.contexts.map((c) => c.slug)).toEqual(['one', 'two']);
  });

  it('returns conflicts and includes force flag when set', async () => {
    await writeContext('x', { name: 'x' }, 'b');
    const { fn, calls } = mockFetch({
      accepted: [],
      conflicts: [{ slug: 'x', reason: 'stale', serverVersion: 7 }],
    } satisfies PushResponse);
    const result = await pushAll('https://x.test', 'tok', { force: true }, { fetch: fn });
    expect(result.conflicts).toHaveLength(1);
    const body = JSON.parse(String(calls[0]!.init.body)) as { force?: boolean };
    expect(body.force).toBe(true);
  });
});
