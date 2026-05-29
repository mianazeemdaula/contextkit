import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadConfig, resolveApiBase, saveConfig, type CkConfig } from './config.js';

interface PkgJson {
  version: string;
}

function readVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../../package.json') as PkgJson;
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

/** Allowed value types for telemetry props. */
export type TelemetryValue = string | number | boolean;

/**
 * Fire-and-forget telemetry hit. Returns immediately; never throws.
 * No network is touched when `config.telemetry !== true`.
 */
export async function track(
  event: string,
  props: Record<string, TelemetryValue> = {},
): Promise<void> {
  let cfg: CkConfig;
  try {
    cfg = await loadConfig();
  } catch {
    return;
  }
  if (cfg.telemetry !== true) return;
  let anonId = cfg.anonId;
  if (typeof anonId !== 'string' || anonId.length === 0) {
    anonId = randomUUID();
    try {
      await saveConfig({ ...cfg, anonId });
    } catch {
      // best-effort
    }
  }
  const apiBase = resolveApiBase(cfg);
  const body = JSON.stringify({
    event,
    props,
    ts: new Date().toISOString(),
    version: readVersion(),
    anonId,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    await fetch(`${apiBase}/api/telemetry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      signal: controller.signal,
    });
  } catch {
    // swallow — telemetry is best-effort
  } finally {
    clearTimeout(timer);
  }
}

/** Generate a new anonymous id (exported for tests / `ck telemetry on`). */
export function newAnonId(): string {
  return randomUUID();
}
