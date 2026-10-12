export { MIGRATIONS, V1_LABEL_FAMILIES, migrateV1Board, runMigrations } from './migrations';
export {
  BOARDS_STORAGE_KEY,
  CURRENT_BOARDS_VERSION,
  LEGACY_BOARDS_STORAGE_KEY,
  MAX_SLOTS,
  SLOT_NAME_MAX_LENGTH,
  documentSchema,
  savedSlotSchema,
} from './schema';
export type { BoardsWrapper, SavedSlot } from './schema';
export {
  canSaveBoard,
  deleteSlot,
  isStorageAvailable,
  loadBoards,
  pickAutoLoadSlot,
  saveSlot,
  skippedBoardsMessage,
} from './slots';
export type { DeleteResult, LoadBoardsResult, SaveResult } from './slots';
export { VISITED_STORAGE_KEY, isFirstVisit, markVisited } from './visited';
