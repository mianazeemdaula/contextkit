import type { Command } from 'commander';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { loadConfig, resolveApiBase } from '../lib/config.js';
import { saveAuth } from '../lib/auth.js';
import { CkError } from '../errors.js';
import { info, success, warn } from '../lib/log.js';

interface LoginOpts {
  token?: string;
}

/** Register `ck login` on the program. */
export function register(program: Command): void {
  program
    .command('login')
    .description('authenticate with contextkit.app via browser callback')
    .option('--token <t>', 'skip the browser flow and write this token directly')
    .action((opts: LoginOpts) => handler(opts));
}

async function handler(opts: LoginOpts): Promise<void> {
  if (opts.token && opts.token.length > 0) {
    await saveAuth(opts.token);
    success('token saved');
    return;
  }
  const cfg = await loadConfig();
  const apiBase = resolveApiBase(cfg);
  const token = await runBrowserFlow(apiBase);
  await saveAuth(token);
  success('logged in');
}

function runBrowserFlow(apiBase: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        if (url.pathname !== '/cb') {
          res.writeHead(404).end('not found');
          return;
        }
        const token = url.searchParams.get('token');
        if (!token) {
          res.writeHead(400).end('missing token');
          return;
        }
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<html><body><h1>ContextKit</h1><p>You can close this tab.</p></body></html>');
        cleanup();
        resolve(token);
      } catch (e) {
        cleanup();
        reject(e as Error);
      }
    });

    const timeout = setTimeout(() => {
      cleanup();
      reject(new CkError('EUSER', 'login timed out after 120s'));
    }, 120_000);

    const cleanup = (): void => {
      clearTimeout(timeout);
      server.close();
    };

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        cleanup();
        reject(new CkError('ESYS', 'failed to bind local callback server'));
        return;
      }
      const callback = `http://127.0.0.1:${addr.port}/cb`;
      const target = `${apiBase}/cli/auth?callback=${encodeURIComponent(callback)}`;
      info(`open: ${target}`);
      info('or paste a token from contextkit.app/settings/cli using --token <t>');
      try {
        openBrowser(target);
      } catch {
        warn('could not open browser automatically — open the URL above manually');
      }
    });
  });
}

function openBrowser(url: string): void {
  const platform = process.platform;
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  if (platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}
