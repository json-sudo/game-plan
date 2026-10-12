export const VISITED_STORAGE_KEY = 'game-plan:visited';

export function isFirstVisit(storage: Storage = localStorage): boolean {
  try {
    return storage.getItem(VISITED_STORAGE_KEY) === null;
  } catch {
    return true;
  }
}

export function markVisited(storage: Storage = localStorage): void {
  try {
    storage.setItem(VISITED_STORAGE_KEY, '1');
  } catch {
    return;
  }
}
