export {
  CURRENT_TACTICS_VERSION,
  MAX_SLOTS,
  MAX_TACTICS_STORAGE_CHARS,
  SLOT_NAME_MAX_LENGTH,
  TACTICS_STORAGE_KEY,
  documentSchema,
  savedSlotSchema,
  tacticSchema,
} from './schema';
export type { TacticsWrapper, SavedSlot } from './schema';
export {
  canSaveTactic,
  deleteSlot,
  isStorageAvailable,
  loadTactics,
  pickAutoLoadSlot,
  saveSlot,
  skippedTacticsMessage,
} from './slots';
export type { DeleteResult, LoadTacticsResult, SaveResult } from './slots';
export { VISITED_STORAGE_KEY, isFirstVisit, markVisited } from './visited';
