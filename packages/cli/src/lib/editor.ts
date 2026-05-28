import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { CkError } from '../errors.js';

/**
 * Open `filepath` in the user's $EDITOR (or platform default) and block until
 * the editor exits. Throws ESYS if the editor process fails to start.
 */
export function openEditor(filepath: string): void {
  const editor = pickEditor();
  const [cmd, ...args] = editor;
  if (!cmd) {
    throw new CkError('ESYS', 'no editor configured; set $EDITOR or $VISUAL');
  }
  const result = spawnSync(cmd, [...args, filepath], { stdio: 'inherit', shell: false });
  if (result.error) {
    throw new CkError('ESYS', `failed to launch editor "${cmd}": ${result.error.message}`);
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new CkError('ESYS', `editor "${cmd}" exited with code ${result.status}`);
  }
}

function pickEditor(): string[] {
  const env = process.env['VISUAL'] ?? process.env['EDITOR'];
  if (env && env.trim().length > 0) return env.split(/\s+/);
  return platform() === 'win32' ? ['notepad'] : ['vi'];
}
