import type { Command } from 'commander';
import { assertSlug } from '../lib/slug.js';
import { readContext, buildInjection } from '../lib/storage.js';
import { copy as clipboardCopy } from '../lib/clipboard.js';
import { success, warn } from '../lib/log.js';

interface InjectOpts {
  stdout?: boolean;
}

/**
 * Register `ck inject <slug>`. Outputs the post-processed injection string
 * (XML wrap + newline flags applied). Pipes to stdout with `--stdout`, else
 * copies to the clipboard for one-click pasting into any AI chat.
 */
export function register(program: Command): void {
  program
    .command('inject <slug>')
    .description('output a context ready for injection (post-processing applied)')
    .option('--stdout', 'write to stdout instead of the clipboard (for piping)')
    .action((slug: string, opts: InjectOpts) => handler(slug, opts));
}

async function handler(slug: string, opts: InjectOpts): Promise<void> {
  assertSlug(slug);
  const parsed = await readContext(slug);
  const text = buildInjection(parsed.frontmatter, parsed.body);
  if (opts.stdout) {
    process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
    return;
  }
  const ok = await clipboardCopy(text);
  if (ok) {
    success(`injected "${parsed.frontmatter.name}" via clipboard`);
    return;
  }
  warn('no clipboard tool available; piping text to stdout');
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
}
