/**
 * Snapshot freshness against P01 (DEV-12 holdout H04). Pure: both the age and
 * the limit arrive already in seconds from the parameter card. Arithmetic that
 * converts milliseconds lives outside domain (S-8).
 *
 * Stale evidence blocks write/runner (degradation.md). Absence of a freshness
 * signal is never treated as healthy (PROTO-12).
 */

export function snapshotIsStale(ageSeconds: number, staleAfterSeconds: number): boolean {
  return ageSeconds > staleAfterSeconds;
}
