import type { Command } from 'commander';
import { loadConfig, resolveApiBase } from '../lib/config.js';
import { loadAuth } from '../lib/auth.js';
import { pullAll, pushAll } from '../lib/sync.js';
import { listContexts } from '../lib/storage.js';
import { CkError } from '../errors.js';
import { info, success, warn } from '../lib/log.js';

interface SyncOpts {
  push?: boolean;
  pull?: boolean;
  status?: boolean;
  force?: boolean;
  since?: string;
}

/** Register `ck sync` on the program. */
export function register(program: Command): void {
  program
    .command('sync')
    .description('sync contexts with the cloud (bidirectional by default)')
    .option('--push', 'only push local contexts to the cloud')
    .option('--pull', 'only pull cloud contexts to local')
    .option('--status', 'show local/cloud diff without syncing')
    .option('--force', 'overwrite server copies on conflict (push)')
    .option('--since <iso>', 'only pull contexts updated after this ISO timestamp')
    .action((opts: SyncOpts) => handler(opts));
}

async function handler(opts: SyncOpts): Promise<void> {
  const cfg = await loadConfig();
  const auth = await loadAuth();
  if (!auth) throw new CkError('EUSER', 'not logged in — run `ck login`');
  const apiBase = resolveApiBase(cfg);

  if (opts.status) {
    const local = await listContexts();
    info(`logged in; API base: ${apiBase}`);
    info(`${local.length} local context${local.length === 1 ? '' : 's'}`);
    return;
  }

  const doPush = opts.push || !opts.pull;
  const doPull = opts.pull || !opts.push;

  if (doPush) {
    const result = await pushAll(apiBase, auth.token, opts.force ? { force: true } : {});
    for (const slug of result.accepted) success(`pushed ${slug}`);
    for (const c of result.conflicts) {
      warn(`conflict on ${c.slug}: ${c.reason} (server version ${c.serverVersion})`);
    }
    if (result.conflicts.length > 0 && !opts.force) {
      throw new CkError('EUSER', 'conflicts detected — re-run with --force to overwrite');
    }
    if (result.accepted.length === 0 && result.conflicts.length === 0) info('nothing to push');
  }

  if (doPull) {
    const result = await pullAll(apiBase, auth.token, opts.since ? { since: opts.since } : {});
    for (const slug of result.pulled) success(`pulled ${slug}`);
    for (const slug of result.skipped) info(`skipped ${slug} (local is newer or equal)`);
    if (result.pulled.length === 0 && result.skipped.length === 0) info('nothing to pull');
  }
}
