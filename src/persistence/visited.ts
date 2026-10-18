export const VISITED_STORAGE_KEY = 'game-plan:visited';

export function isFirstVisit(storage?: Storage): boolean {
  try {
    return (storage ?? localStorage).getItem(VISITED_STORAGE_KEY) === null;
  } catch {
    return true;
  }
}

export function markVisited(storage?: Storage): void {
  try {
    (storage ?? localStorage).setItem(VISITED_STORAGE_KEY, '1');
  } catch {
    return;
  }
}
