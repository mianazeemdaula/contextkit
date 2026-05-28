/**
 * Typed error for user-facing failures (exit 1) vs. system failures (exit 2).
 */
export class CkError extends Error {
  public readonly code: 'EUSER' | 'ESYS';
  constructor(code: 'EUSER' | 'ESYS', message: string) {
    super(message);
    this.code = code;
    this.name = 'CkError';
  }
}

/** Map a CkError to its process exit code. */
export function exitCodeFor(err: unknown): number {
  if (err instanceof CkError) return err.code === 'EUSER' ? 1 : 2;
  return 2;
}
