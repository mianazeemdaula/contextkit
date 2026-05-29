import { describe, it, expect } from 'vitest';
import { completionScript } from './completions.js';

const COMMANDS = [
  'init',
  'add',
  'list',
  'get',
  'edit',
  'rm',
  'copy',
  'inject',
  'template',
  'pull',
  'push',
  'login',
  'logout',
  'token',
  'telemetry',
  'completions',
];

describe('completions command', () => {
  for (const shell of ['bash', 'zsh', 'fish'] as const) {
    it(`${shell} script mentions every top-level command`, () => {
      const script = completionScript(shell);
      expect(script.length).toBeGreaterThan(0);
      for (const cmd of COMMANDS) {
        expect(script).toContain(cmd);
      }
    });
  }

  it('bash script registers _ck_complete for both binaries', () => {
    const s = completionScript('bash');
    expect(s).toMatch(/complete -F _ck_complete ck contextkit/);
  });

  it('zsh script starts with #compdef', () => {
    expect(completionScript('zsh').startsWith('#compdef')).toBe(true);
  });

  it('fish script uses __fish_use_subcommand', () => {
    expect(completionScript('fish')).toContain('__fish_use_subcommand');
  });
});
