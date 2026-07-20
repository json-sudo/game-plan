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

/** A migration transforms a wrapper-shaped object at version N into version N+1. */
export type Migration = (data: RawWrapper) => RawWrapper;

/** Loosely-typed wrapper shape used while migrating between versions. */
export interface RawWrapper {
  version: number;
  [key: string]: unknown;
}

/** No real migrations exist yet — this is the first shape. Tests inject fakes. */
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

function isRawWrapper(data: unknown): data is RawWrapper {
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

function isValidWrapper(data: RawWrapper): boolean {
  if (data.version !== CURRENT_BOARDS_VERSION) return false;
  if (!Array.isArray(data.slots)) return false;
  return data.slots.length <= MAX_SLOTS && data.slots.every(isSavedSlot);
}

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
