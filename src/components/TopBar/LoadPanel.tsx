import { useState } from 'react';
import type { BoardState } from '../../board/types';
import { formatTimestamp, type PersistedBoards } from './boardSlots';
import { Modal } from './Modal';

export function LoadPanel({
  persisted,
  onClose,
  onLoaded,
}: {
  persisted: PersistedBoards;
  onClose: () => void;
  onLoaded: (board: BoardState) => void;
}) {
  const { slots, loadSlot } = persisted;
  const [error, setError] = useState<string | null>(null);

  const select = (id: string) => {
    const result = loadSlot(id);
    if (result.status !== 'ok') {
      setError("Couldn't load that board — the saved data looks corrupted.");
      return;
    }
    onLoaded(result.slot.board);
    onClose();
  };

  return (
    <Modal label="Load board" className="slot-panel" onClose={onClose}>
      <header className="formation-modal__header">
        <h2>Load Board</h2>
        <button type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>

      <ul className="slot-panel__list">
        {slots.map((slot) => (
          <li key={slot.id}>
            <button type="button" onClick={() => select(slot.id)}>
              <span className="slot-panel__row-name">{slot.name}</span>
              <span className="slot-panel__row-time">{formatTimestamp(slot.savedAt)}</span>
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="slot-panel__error">{error}</p>}
    </Modal>
  );
}
