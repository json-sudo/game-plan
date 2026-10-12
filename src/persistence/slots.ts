import { FM26_DATA } from '../data/fm26';
import { documentIssues, placedPlayers, type PitchDocument } from '../state';
import {
  CURRENT_TACTICS_VERSION,
  MAX_SLOTS,
  SLOT_NAME_MAX_LENGTH,
  TACTICS_STORAGE_KEY,
  savedSlotSchema,
  wrapperHeadSchema,
  type TacticsWrapper,
  type SavedSlot,
} from './schema';

export const MIN_PLACED_TO_SAVE = 9;

export type LoadTacticsResult =
  | { status: 'empty' }
  | { status: 'unavailable' }
  | { status: 'corrupt' }
  | { status: 'ok'; wrapper: TacticsWrapper; skipped: number };

export type SaveResult =
  { status: 'ok'; wrapper: TacticsWrapper; slotId: string } | { status: 'error'; message: string };

export type DeleteResult =
  { status: 'ok'; wrapper: TacticsWrapper } | { status: 'error'; message: string };

function readRaw(storage: Storage): string | null | undefined {
  try {
    return storage.getItem(TACTICS_STORAGE_KEY);
  } catch {
    return undefined;
  }
}

function parseSlot(slot: unknown): SavedSlot | null {
  const parsed = savedSlotSchema.safeParse(slot);
  if (!parsed.success) return null;
  return documentIssues(parsed.data.tactic, FM26_DATA) === null ? parsed.data : null;
}

function readWrapper(raw: string): { version: number; slots: unknown[] } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const head = wrapperHeadSchema.safeParse(parsed);
  return head.success && head.data.version === CURRENT_TACTICS_VERSION ? head.data : null;
}

export function loadTactics(storage: Storage = localStorage): LoadTacticsResult {
  const raw = readRaw(storage);
  if (raw === undefined) return { status: 'unavailable' };
  if (raw === null) return { status: 'empty' };
  const head = readWrapper(raw);
  if (!head) return { status: 'corrupt' };

  const parsed = head.slots.map(parseSlot);
  const valid = parsed.filter((slot): slot is SavedSlot => slot !== null);
  const slots = valid.slice(0, MAX_SLOTS);
  return {
    status: 'ok',
    wrapper: { version: CURRENT_TACTICS_VERSION, slots },
    skipped: head.slots.length - slots.length,
  };
}

export function skippedTacticsMessage(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? '1 saved tactic was skipped.' : `${count} saved tactics were skipped.`;
}

export function pickAutoLoadSlot(wrapper: TacticsWrapper): SavedSlot | null {
  return wrapper.slots.reduce<SavedSlot | null>(
    (latest, slot) => (!latest || slot.savedAt > latest.savedAt ? slot : latest),
    null,
  );
}

export function canSaveTactic(tactic: PitchDocument): boolean {
  return placedPlayers(tactic).length >= MIN_PLACED_TO_SAVE;
}

function createSlotId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function writeWrapper(storage: Storage, wrapper: TacticsWrapper): boolean {
  try {
    storage.setItem(TACTICS_STORAGE_KEY, JSON.stringify(wrapper));
    return true;
  } catch {
    return false;
  }
}

export function saveSlot(
  wrapper: TacticsWrapper | null,
  targetSlotId: string | null,
  name: string,
  tactic: PitchDocument,
  storage: Storage = localStorage,
  now: number = Date.now(),
): SaveResult {
  if (documentIssues(tactic, FM26_DATA) !== null) {
    return { status: 'error', message: "This tactic can't be saved." };
  }
  const slots = wrapper ? wrapper.slots : [];
  const trimmedName = name.trim().slice(0, SLOT_NAME_MAX_LENGTH);
  const existing = targetSlotId ? slots.find((slot) => slot.id === targetSlotId) : undefined;

  if (!existing && slots.length >= MAX_SLOTS) {
    return { status: 'error', message: 'Both save slots are full. Choose one to overwrite.' };
  }
  const slotId = existing ? existing.id : createSlotId();
  const saved: SavedSlot = { id: slotId, name: trimmedName, savedAt: now, tactic };
  const nextSlots = existing
    ? slots.map((slot) => (slot === existing ? saved : slot))
    : [...slots, saved];
  const nextWrapper: TacticsWrapper = { version: CURRENT_TACTICS_VERSION, slots: nextSlots };
  if (!writeWrapper(storage, nextWrapper)) {
    return { status: 'error', message: "Couldn't save. Storage is full or unavailable." };
  }
  return { status: 'ok', wrapper: nextWrapper, slotId };
}

export function deleteSlot(
  wrapper: TacticsWrapper,
  slotId: string,
  storage: Storage = localStorage,
): DeleteResult {
  if (!wrapper.slots.some((slot) => slot.id === slotId)) {
    return { status: 'error', message: 'That save no longer exists.' };
  }
  const next: TacticsWrapper = {
    version: CURRENT_TACTICS_VERSION,
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
