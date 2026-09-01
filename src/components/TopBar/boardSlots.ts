import type { usePersistedBoards } from '../../board/usePersistedBoards';

export type PersistedBoards = ReturnType<typeof usePersistedBoards>;

export function formatTimestamp(savedAt: number): string {
  return new Date(savedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
