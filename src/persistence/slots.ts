import { MIGRATIONS, runMigrations } from './migrations';
import {
  BOARDS_STORAGE_KEY,
  CURRENT_BOARDS_VERSION,
  MAX_SLOTS,
  SLOT_NAME_MAX_LENGTH,
  isRawWrapper,
  isValidWrapper,
  type BoardsWrapper,
  type SavedSlot,
} from './schema';
import type { BoardState } from './types';

export type LoadWrapperResult =
  { status: 'empty' } | { status: 'ok'; wrapper: BoardsWrapper } | { status: 'corrupt' };

/** Reads and migrates the boards wrapper from storage. Never throws. */
export function loadBoardsWrapper(storage: Storage = localStorage): LoadWrapperResult {
  let raw: string | null;
  try {
    raw = storage.getItem(BOARDS_STORAGE_KEY);
  } catch {
    return { status: 'empty' };
  }
  if (raw === null) return { status: 'empty' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt' };
  }

  if (!isRawWrapper(parsed)) return { status: 'corrupt' };
  const migrated = runMigrations(parsed, MIGRATIONS, CURRENT_BOARDS_VERSION);
  if (!migrated || !isValidWrapper(migrated)) return { status: 'corrupt' };
  return {
    status: 'ok',
    wrapper: { version: CURRENT_BOARDS_VERSION, slots: migrated.slots as SavedSlot[] },
  };
}

/** Picks the slot with the latest savedAt, or null if there are none. */
export function pickAutoLoadSlot(wrapper: BoardsWrapper): SavedSlot | null {
  return wrapper.slots.reduce<SavedSlot | null>(
    (latest, slot) => (!latest || slot.savedAt > latest.savedAt ? slot : latest),
    null,
  );
}

/** True once at least 9 player pieces (either team, combined) are placed on the pitch. */
export function canSaveBoard(board: BoardState): boolean {
  return board.pieces.filter((p) => p.type === 'player' && p.position !== undefined).length >= 9;
}

function createSlotId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type SaveResult =
  { status: 'ok'; wrapper: BoardsWrapper; slotId: string } | { status: 'error'; message: string };

/**
 * Saves `board` into the slot identified by `targetSlotId`, or creates a new slot when
 * `targetSlotId` is null. Fails (without touching other slots) when both slots are full
 * and no target was given, or when the underlying write throws (e.g. quota exceeded).
 */
export function saveSlot(
  wrapper: BoardsWrapper | null,
  targetSlotId: string | null,
  name: string,
  board: BoardState,
  storage: Storage = localStorage,
  now: number = Date.now(),
): SaveResult {
  const slots = wrapper ? wrapper.slots : [];
  const trimmedName = name.trim().slice(0, SLOT_NAME_MAX_LENGTH);
  let nextSlots: SavedSlot[];
  let slotId: string;

  const existingIndex = targetSlotId ? slots.findIndex((s) => s.id === targetSlotId) : -1;

  if (existingIndex !== -1) {
    slotId = targetSlotId!;
    nextSlots = slots.map((s, i) =>
      i === existingIndex ? { ...s, name: trimmedName, savedAt: now, board } : s,
    );
  } else {
    if (slots.length >= MAX_SLOTS) {
      return {
        status: 'error',
        message:
          'Both save slots are full — choose one to overwrite, or create an account for more.',
      };
    }
    slotId = createSlotId();
    nextSlots = [...slots, { id: slotId, name: trimmedName, savedAt: now, board }];
  }

  const nextWrapper: BoardsWrapper = { version: CURRENT_BOARDS_VERSION, slots: nextSlots };

  try {
    storage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(nextWrapper));
  } catch {
    return { status: 'error', message: "Couldn't save — storage is full" };
  }

  return { status: 'ok', wrapper: nextWrapper, slotId };
}

/** Probes whether storage is usable (private-browsing / disabled localStorage). */
export function isStorageAvailable(storage: Storage = localStorage): boolean {
  const probeKey = '__gameplan_storage_probe__';
  try {
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}
