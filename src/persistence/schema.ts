import type { BoardState } from './types';

export const BOARDS_STORAGE_KEY = 'gameplan:boards:v1';
export const CURRENT_BOARDS_VERSION = 1;
export const MAX_SLOTS = 2;
export const SLOT_NAME_MAX_LENGTH = 24;

export interface SavedSlot {
  id: string;
  name: string;
  savedAt: number;
  board: BoardState;
}

export interface BoardsWrapper {
  version: number;
  slots: SavedSlot[];
}

export interface RawWrapper {
  version: number;
  [key: string]: unknown;
}

export function isRawWrapper(data: unknown): data is RawWrapper {
  if (typeof data !== 'object' || data === null) return false;
  const version = (data as Record<string, unknown>).version;
  return typeof version === 'number';
}

function isSavedSlot(data: unknown): data is SavedSlot {
  if (typeof data !== 'object' || data === null) return false;
  const slot = data as Record<string, unknown>;
  return (
    typeof slot.id === 'string' &&
    typeof slot.name === 'string' &&
    typeof slot.savedAt === 'number' &&
    typeof slot.board === 'object' &&
    slot.board !== null &&
    Array.isArray((slot.board as BoardState).pieces)
  );
}

export function isValidWrapper(data: RawWrapper): boolean {
  if (data.version !== CURRENT_BOARDS_VERSION) return false;
  if (!Array.isArray(data.slots)) return false;
  return data.slots.length <= MAX_SLOTS && data.slots.every(isSavedSlot);
}
