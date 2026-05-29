import { mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { home } from './storage.js';

/** On-disk shape of `~/.contextkit/auth.json`. */
export interface AuthFile {
  token: string;
  /** ISO-8601 timestamp the token was saved. */
  savedAt: string;
}

/** Absolute path to the auth file under the storage root. */
export function authPath(): string {
  return join(home(), 'auth.json');
}

/** Load saved auth, or `null` when the user is not logged in. */
export async function loadAuth(): Promise<AuthFile | null> {
  try {
    const raw = await readFile(authPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AuthFile>;
    if (typeof parsed.token !== 'string' || parsed.token.length === 0) return null;
    return {
      token: parsed.token,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

/** Persist a token to `~/.contextkit/auth.json`. */
export async function saveAuth(token: string): Promise<AuthFile> {
  await mkdir(home(), { recursive: true });
  const auth: AuthFile = { token, savedAt: new Date().toISOString() };
  await writeFile(authPath(), `${JSON.stringify(auth, null, 2)}\n`, 'utf8');
  return auth;
}

/** Remove the auth file. Returns `true` if a file was deleted. */
export async function clearAuth(): Promise<boolean> {
  try {
    await stat(authPath());
  } catch {
    return false;
  }
  await rm(authPath());
  return true;
}
