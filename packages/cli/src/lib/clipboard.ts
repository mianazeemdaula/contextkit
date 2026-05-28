// Uses node:child_process to shell out to native clipboard tools.
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

/**
 * Copy `text` to the system clipboard. Returns true on success.
 * Tries pbcopy (darwin), xclip/xsel/wl-copy (linux), clip.exe / clip (win32).
 */
export async function copy(text: string): Promise<boolean> {
  const candidates = pickCandidates();
  for (const cand of candidates) {
    if (await tryCopy(cand.cmd, cand.args, text)) return true;
  }
  return false;
}

interface Candidate {
  cmd: string;
  args: string[];
}

function pickCandidates(): Candidate[] {
  const p = platform();
  if (p === 'darwin') return [{ cmd: 'pbcopy', args: [] }];
  if (p === 'win32')
    return [
      { cmd: 'clip', args: [] },
      { cmd: 'clip.exe', args: [] },
    ];
  return [
    { cmd: 'wl-copy', args: [] },
    { cmd: 'xclip', args: ['-selection', 'clipboard'] },
    { cmd: 'xsel', args: ['--clipboard', '--input'] },
  ];
}

function tryCopy(cmd: string, args: string[], text: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'] });
    } catch {
      resolve(false);
      return;
    }
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
    child.stdin.end(text, 'utf8');
  });
}
