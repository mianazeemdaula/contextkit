import type { Command } from 'commander';
import { assertSlug } from '../lib/slug.js';
import { contextPath, readContext, writeContext } from '../lib/storage.js';
import { openEditor } from '../lib/editor.js';
import { success } from '../lib/log.js';

/** Register `ck edit <slug>` on the program. */
export function register(program: Command): void {
  program
    .command('edit <slug>')
    .description('open an existing context in $EDITOR; saves a snapshot on exit')
    .action((slug: string) => handler(slug));
}

async function handler(slug: string): Promise<void> {
  assertSlug(slug);
  await readContext(slug); // throws EUSER if missing
  openEditor(contextPath(slug));
  const after = await readContext(slug);
  await writeContext(slug, after.frontmatter, after.body);
  success(`saved ${contextPath(slug)}`);
}
