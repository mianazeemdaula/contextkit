#!/usr/bin/env node
import { main } from './cli.js';

main(process.argv).catch((err: unknown) => {
  // Top-level safety net; commands handle their own errors first.
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`contextkit: ${msg}\n`);
  process.exit(2);
});
