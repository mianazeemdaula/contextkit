// commander v12 API: https://github.com/tj/commander.js
import { Command } from 'commander';
import { createRequire } from 'node:module';
import { register as registerInit } from './commands/init.js';
import { register as registerAdd } from './commands/add.js';
import { register as registerList } from './commands/list.js';
import { register as registerGet } from './commands/get.js';
import { register as registerEdit } from './commands/edit.js';
import { register as registerRm } from './commands/rm.js';
import { register as registerCopy } from './commands/copy.js';
import { register as registerInject } from './commands/inject.js';
import { register as registerTemplate } from './commands/template.js';
import { CkError, exitCodeFor } from './errors.js';
import { error } from './lib/log.js';

interface PkgJson {
  version: string;
}

function readVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as PkgJson;
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

/** Build the configured commander program with every subcommand registered. */
export function buildProgram(): Command {
  const program = new Command();
  program
    .name('ck')
    .description('ContextKit — save your AI context once, inject into any AI tool')
    .version(readVersion(), '-v, --version', 'print version');

  registerInit(program);
  registerAdd(program);
  registerList(program);
  registerGet(program);
  registerEdit(program);
  registerRm(program);
  registerCopy(program);
  registerInject(program);
  registerTemplate(program);

  program
    .command('version')
    .description('print version')
    .action(() => {
      process.stdout.write(`${readVersion()}\n`);
    });

  program.exitOverride();
  return program;
}

/** CLI entrypoint. Parses argv and runs the chosen command. */
export async function main(argv: string[]): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(argv);
  } catch (err: unknown) {
    if (err instanceof CkError) {
      error(err.message);
      process.exit(exitCodeFor(err));
    }
    // commander throws CommanderError for --help / unknown command; respect its exitCode.
    const maybe = err as { exitCode?: number; code?: string; message?: string };
    if (typeof maybe.exitCode === 'number') {
      process.exit(maybe.exitCode);
    }
    error(maybe.message ?? String(err));
    process.exit(2);
  }
}
