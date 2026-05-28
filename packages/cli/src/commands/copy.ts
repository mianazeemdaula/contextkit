import type { Command } from 'commander';
import { assertSlug } from '../lib/slug.js';
import { readContext } from '../lib/storage.js';
import { copy as clipboardCopy } from '../lib/clipboard.js';
import { success, warn } from '../lib/log.js';

/** Register `ck copy <slug>` on the program. */
export function register(program: Command): void {
  program
    .command('copy <slug>')
    .description("copy a context's body to the system clipboard")
    .action((slug: string) => handler(slug));
}

async function handler(slug: string): Promise<void> {
  assertSlug(slug);
  const parsed = await readContext(slug);
  const ok = await clipboardCopy(parsed.body);
  if (ok) {
    success(`copied "${slug}" to clipboard (${parsed.body.length} chars)`);
    return;
  }
  warn('no clipboard tool available; writing body to stdout instead');
  process.stdout.write(parsed.body.endsWith('\n') ? parsed.body : `${parsed.body}\n`);
}
