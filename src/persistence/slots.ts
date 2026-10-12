import { FM26_DATA } from '../data/fm26';
import { documentIssues, placedPlayers, type BoardDocument } from '../state';
import { MIGRATIONS, runMigrations } from './migrations';
import {
  BOARDS_STORAGE_KEY,
  CURRENT_BOARDS_VERSION,
  LEGACY_BOARDS_STORAGE_KEY,
  MAX_SLOTS,
  SLOT_NAME_MAX_LENGTH,
  savedSlotSchema,
  wrapperHeadSchema,
  type BoardsWrapper,
  type SavedSlot,
  type SlotEntry,
} from './schema';

export const MIN_PLACED_TO_SAVE = 9;

export type LoadBoardsResult =
  | { status: 'empty' }
  | { status: 'unavailable' }
  | { status: 'corrupt' }
  | { status: 'ok'; wrapper: BoardsWrapper; skipped: number };

export type SaveResult =
  { status: 'ok'; wrapper: BoardsWrapper; slotId: string } | { status: 'error'; message: string };

export type DeleteResult =
  { status: 'ok'; wrapper: BoardsWrapper } | { status: 'error'; message: string };

interface RawRead {
  raw: string | null;
  legacy: boolean;
}

function readRaw(storage: Storage): RawRead | null {
  try {
    const current = storage.getItem(BOARDS_STORAGE_KEY);
    if (current !== null) return { raw: current, legacy: false };
    return { raw: storage.getItem(LEGACY_BOARDS_STORAGE_KEY), legacy: true };
  } catch {
    return null;
  }
}

function parseEntry(entry: SlotEntry): SavedSlot | null {
  const migrated = runMigrations(entry, MIGRATIONS, CURRENT_BOARDS_VERSION);
  if (!migrated) return null;
  const parsed = savedSlotSchema.safeParse(migrated.slot);
  if (!parsed.success) return null;
  return documentIssues(parsed.data.board, FM26_DATA) === null ? parsed.data : null;
}

function persistMigrated(storage: Storage, wrapper: BoardsWrapper, skipped: number): void {
  try {
    storage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(wrapper));
    if (skipped === 0) storage.removeItem(LEGACY_BOARDS_STORAGE_KEY);
  } catch {
    return;
  }
}

function readWrapper(raw: string): { version: number; slots: unknown[] } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const head = wrapperHeadSchema.safeParse(parsed);
  return head.success && head.data.version <= CURRENT_BOARDS_VERSION ? head.data : null;
}

export function loadBoards(storage: Storage = localStorage): LoadBoardsResult {
  const read = readRaw(storage);
  if (!read) return { status: 'unavailable' };
  if (read.raw === null) return { status: 'empty' };
  const head = readWrapper(read.raw);
  if (!head) return { status: 'corrupt' };

  const parsed = head.slots.map((slot) => parseEntry({ version: head.version, slot }));
  const valid = parsed.filter((slot): slot is SavedSlot => slot !== null);
  const kept = valid.slice(0, MAX_SLOTS);
  const wrapper: BoardsWrapper = { version: CURRENT_BOARDS_VERSION, slots: kept };
  const skipped = head.slots.length - kept.length;
  if (read.legacy) persistMigrated(storage, wrapper, skipped);
  return { status: 'ok', wrapper, skipped };
}

export function skippedBoardsMessage(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? '1 saved board could not be read and was skipped.'
    : `${count} saved boards could not be read and were skipped.`;
}

export function pickAutoLoadSlot(wrapper: BoardsWrapper): SavedSlot | null {
  return wrapper.slots.reduce<SavedSlot | null>(
    (latest, slot) => (!latest || slot.savedAt > latest.savedAt ? slot : latest),
    null,
  );
}

export function canSaveBoard(board: BoardDocument): boolean {
  return placedPlayers(board).length >= MIN_PLACED_TO_SAVE;
}

function createSlotId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function writeWrapper(storage: Storage, wrapper: BoardsWrapper): boolean {
  try {
    storage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(wrapper));
    return true;
  } catch {
    return false;
  }
}

export function saveSlot(
  wrapper: BoardsWrapper | null,
  targetSlotId: string | null,
  name: string,
  board: BoardDocument,
  storage: Storage = localStorage,
  now: number = Date.now(),
): SaveResult {
  if (documentIssues(board, FM26_DATA) !== null) {
    return { status: 'error', message: "This board can't be saved." };
  }
  const slots = wrapper ? wrapper.slots : [];
  const trimmedName = name.trim().slice(0, SLOT_NAME_MAX_LENGTH);
  const existing = targetSlotId ? slots.find((slot) => slot.id === targetSlotId) : undefined;

  if (!existing && slots.length >= MAX_SLOTS) {
    return {
      status: 'error',
      message: 'Both save slots are full. Choose one to overwrite.',
    };
  }
  const slotId = existing ? existing.id : createSlotId();
  const saved: SavedSlot = { id: slotId, name: trimmedName, savedAt: now, board };
  const nextSlots = existing
    ? slots.map((slot) => (slot === existing ? saved : slot))
    : [...slots, saved];
  const nextWrapper: BoardsWrapper = { version: CURRENT_BOARDS_VERSION, slots: nextSlots };
  if (!writeWrapper(storage, nextWrapper)) {
    return { status: 'error', message: "Couldn't save. Storage is full or unavailable." };
  }
  return { status: 'ok', wrapper: nextWrapper, slotId };
}

export function deleteSlot(
  wrapper: BoardsWrapper,
  slotId: string,
  storage: Storage = localStorage,
): DeleteResult {
  if (!wrapper.slots.some((slot) => slot.id === slotId)) {
    return { status: 'error', message: 'That save no longer exists.' };
  }
  const next: BoardsWrapper = {
    version: CURRENT_BOARDS_VERSION,
    slots: wrapper.slots.filter((slot) => slot.id !== slotId),
  };
  if (!writeWrapper(storage, next)) {
    return { status: 'error', message: "Couldn't delete. Storage is unavailable." };
  }
  return { status: 'ok', wrapper: next };
}

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
