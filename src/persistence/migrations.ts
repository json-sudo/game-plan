import type { RawWrapper } from './schema';

/** A migration transforms a wrapper-shaped object at version N into version N+1. */
export type Migration = (data: RawWrapper) => RawWrapper;

export const MIGRATIONS: Record<number, Migration> = {};

/**
 * Runs `data` forward through `migrations` (keyed by the version they migrate *from*)
 * until it reaches `targetVersion`. Returns null if no migration path exists.
 */
export function runMigrations(
  data: RawWrapper,
  migrations: Record<number, Migration>,
  targetVersion: number,
): RawWrapper | null {
  let current = data;
  while (current.version < targetVersion) {
    const migrate = migrations[current.version];
    if (!migrate) return null;
    current = migrate(current);
  }
  return current.version === targetVersion ? current : null;
}
