import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { home } from './storage.js';

export interface CkConfig {
  defaultContext?: string;
  telemetry: false;
  version: 1;
}

const DEFAULT: CkConfig = { telemetry: false, version: 1 };

/** Return the path to config.json under the storage root. */
export function configPath(): string {
  return join(home(), 'config.json');
}

/** Load the config, falling back to defaults if missing or unreadable. */
export async function loadConfig(): Promise<CkConfig> {
  try {
    const raw = await readFile(configPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<CkConfig>;
    return { ...DEFAULT, ...parsed, telemetry: false, version: 1 };
  } catch {
    return { ...DEFAULT };
  }
}

/** Persist a config object as JSON to disk. */
export async function saveConfig(c: CkConfig): Promise<void> {
  await mkdir(home(), { recursive: true });
  await writeFile(configPath(), `${JSON.stringify(c, null, 2)}\n`, 'utf8');
}

/** The shipped default config. */
export function defaultConfig(): CkConfig {
  return { ...DEFAULT };
}
