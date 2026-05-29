import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { home } from './storage.js';

/** On-disk shape of the user config under `~/.contextkit/config.json`. */
export interface CkConfig {
  defaultContext?: string;
  /** Telemetry is opt-in. Default `false`. */
  telemetry: boolean;
  /** Base URL of the ContextKit API (sync, telemetry, auth). */
  apiBase?: string;
  /** Port the local API server (`ck serve`) binds to on 127.0.0.1. */
  apiServerPort: number;
  /** Shared secret required by the local API server (X-ContextKit-Token). */
  localToken?: string;
  /** Stable random identifier used only when `telemetry === true`. */
  anonId?: string;
  version: 1;
}

const DEFAULT: CkConfig = { telemetry: false, apiServerPort: 7842, version: 1 };

/** Return the path to config.json under the storage root. */
export function configPath(): string {
  return join(home(), 'config.json');
}

/** Load the config, falling back to defaults if missing or unreadable. */
export async function loadConfig(): Promise<CkConfig> {
  try {
    const raw = await readFile(configPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<CkConfig>;
    const merged: CkConfig = {
      ...DEFAULT,
      ...parsed,
      telemetry: parsed.telemetry === true,
      apiServerPort:
        typeof parsed.apiServerPort === 'number' ? parsed.apiServerPort : DEFAULT.apiServerPort,
      version: 1,
    };
    return merged;
  } catch {
    return { ...DEFAULT };
  }
}

/** Persist a config object as JSON to disk. */
export async function saveConfig(c: CkConfig): Promise<void> {
  await mkdir(home(), { recursive: true });
  await writeFile(configPath(), `${JSON.stringify(c, null, 2)}\n`, 'utf8');
}

/** The shipped default config, with a freshly generated local API token. */
export function defaultConfig(): CkConfig {
  return { ...DEFAULT, localToken: randomUUID() };
}

/** Default API base when the user hasn't overridden it. */
export const DEFAULT_API_BASE = 'https://contextkit.app';

/** Resolve the effective API base from config (env override wins for testing). */
export function resolveApiBase(c: CkConfig): string {
  const env = process.env['CONTEXTKIT_API_BASE'];
  if (env && env.length > 0) return env;
  return c.apiBase ?? DEFAULT_API_BASE;
}
