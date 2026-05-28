import type { Command } from 'commander';
import { assertSlug } from '../lib/slug.js';
import { readContext } from '../lib/storage.js';
import { copy as clipboardCopy } from '../lib/clipboard.js';
import { success, warn } from '../lib/log.js';

/**
 * Register `ck inject <slug>`. Phase 1 behaves identically to `copy`; Phase 2
 * will hook into browser/native messaging for true one-click inject.
 */
export function register(program: Command): void {
  program
    .command('inject <slug>')
    .description('inject a context (Phase 1: same as copy)')
    .action((slug: string) => handler(slug));
}

async function handler(slug: string): Promise<void> {
  assertSlug(slug);
  const parsed = await readContext(slug);
  const ok = await clipboardCopy(parsed.body);
  if (ok) {
    success(`injected "${slug}" via clipboard`);
    return;
  }
  warn('no clipboard tool available; piping body to stdout');
  process.stdout.write(parsed.body.endsWith('\n') ? parsed.body : `${parsed.body}\n`);
}
