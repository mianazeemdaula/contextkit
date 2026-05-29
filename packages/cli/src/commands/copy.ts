import type { Command } from 'commander';
import { assertSlug } from '../lib/slug.js';
import { readContext, buildInjection, metrics } from '../lib/storage.js';
import { copy as clipboardCopy } from '../lib/clipboard.js';
import { success, warn } from '../lib/log.js';

/** Register `ck copy <slug>` on the program. */
export function register(program: Command): void {
  program
    .command('copy <slug>')
    .description("copy a context's injection text to the system clipboard")
    .action((slug: string) => handler(slug));
}

async function handler(slug: string): Promise<void> {
  assertSlug(slug);
  const parsed = await readContext(slug);
  const text = buildInjection(parsed.frontmatter, parsed.body);
  const { wordCount, tokenEstimate } = metrics(parsed.body);
  const ok = await clipboardCopy(text);
  if (ok) {
    success(
      `copied "${parsed.frontmatter.name}" to clipboard (${wordCount} words, ~${tokenEstimate} tokens)`,
    );
    return;
  }
  warn('no clipboard tool available; writing text to stdout instead');
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
}
