import { useCallback, useState } from 'react';
import type { BoardState } from './types';
import {
  isStorageAvailable,
  loadBoardsWrapper,
  pickAutoLoadSlot,
  saveSlot,
  type BoardsWrapper,
  type SaveResult,
  type SavedSlot,
} from './persistence';

export type LoadSlotResult =
  { status: 'ok'; slot: SavedSlot } | { status: 'corrupt' } | { status: 'not-found' };

function initialWrapper(): BoardsWrapper | null {
  const result = loadBoardsWrapper();
  return result.status === 'ok' ? result.wrapper : null;
}

/**
 * Owns the reactive view of the saved-boards wrapper (slot list, storage availability,
 * and which slot the current session is "attached" to) plus the save/load actions that
 * mutate it. Persistence itself stays in the pure `persistence` module.
 */
export function usePersistedBoards() {
  const [wrapper, setWrapper] = useState<BoardsWrapper | null>(initialWrapper);
  const [storageAvailable] = useState<boolean>(() => isStorageAvailable());
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(() => {
    const w = initialWrapper();
    return w ? (pickAutoLoadSlot(w)?.id ?? null) : null;
  });

  const slots = wrapper?.slots ?? [];

  const save = useCallback(
    (targetSlotId: string | null, name: string, board: BoardState): SaveResult => {
      const result = saveSlot(wrapper, targetSlotId, name, board);
      if (result.status === 'ok') {
        setWrapper(result.wrapper);
        setCurrentSlotId(result.slotId);
      }
      return result;
    },
    [wrapper],
  );

  const loadSlot = useCallback((slotId: string): LoadSlotResult => {
    const result = loadBoardsWrapper();
    if (result.status !== 'ok')
      return { status: result.status === 'empty' ? 'not-found' : 'corrupt' };
    const slot = result.wrapper.slots.find((s) => s.id === slotId);
    if (!slot) return { status: 'not-found' };
    setWrapper(result.wrapper);
    setCurrentSlotId(slotId);
    return { status: 'ok', slot };
  }, []);

  return { slots, storageAvailable, currentSlotId, save, loadSlot };
}
