import type { Command } from 'commander';
import { loadConfig, saveConfig } from '../lib/config.js';
import { newAnonId } from '../lib/telemetry.js';
import { CkError } from '../errors.js';
import { info, success } from '../lib/log.js';

/** Register `ck telemetry <on|off|status>` on the program. */
export function register(program: Command): void {
  program
    .command('telemetry <action>')
    .description('toggle anonymous telemetry (on|off|status) — off by default')
    .action(async (action: string) => {
      const cfg = await loadConfig();
      if (action === 'status') {
        info(cfg.telemetry ? 'telemetry: on' : 'telemetry: off');
        return;
      }
      if (action === 'on') {
        const next = { ...cfg, telemetry: true };
        if (typeof next.anonId !== 'string' || next.anonId.length === 0) {
          next.anonId = newAnonId();
        }
        await saveConfig(next);
        success('telemetry enabled');
        return;
      }
      if (action === 'off') {
        await saveConfig({ ...cfg, telemetry: false });
        success('telemetry disabled');
        return;
      }
      throw new CkError('EUSER', `unknown action "${action}" (try on|off|status)`);
    });
}
