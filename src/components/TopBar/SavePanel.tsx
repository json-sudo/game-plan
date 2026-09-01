import { useEffect, useState } from 'react';
import type { BoardState } from '../../board/types';
import { SLOT_NAME_MAX_LENGTH } from '../../board/persistence';
import { formatTimestamp, type PersistedBoards } from './boardSlots';

const NEW_SLOT = '__new__';

export function SavePanel({
  board,
  persisted,
  onClose,
  onSaved,
}: {
  board: BoardState;
  persisted: PersistedBoards;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { slots, currentSlotId, save } = persisted;
  const atCap = slots.length >= 2;
  const currentIsSlot = slots.some((s) => s.id === currentSlotId);
  const [selected, setSelected] = useState<string | null>(() => {
    if (currentIsSlot) return currentSlotId;
    if (!atCap) return NEW_SLOT;
    return null;
  });
  const [name, setName] = useState(() => {
    if (currentIsSlot) return slots.find((s) => s.id === currentSlotId)?.name ?? '';
    return '';
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selectSlot = (id: string) => {
    setSelected(id);
    setName(id === NEW_SLOT ? '' : (slots.find((s) => s.id === id)?.name ?? ''));
    setError(null);
  };

  const confirm = () => {
    if (!selected || !name.trim()) return;
    const targetSlotId = selected === NEW_SLOT ? null : selected;
    const result = save(targetSlotId, name, board);
    if (result.status === 'error') {
      setError(result.message);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="formation-modal__backdrop" onClick={onClose}>
      <div
        className="slot-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Save board"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="formation-modal__header">
          <h2>Save Board</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <ul className="slot-panel__list">
          {slots.map((slot) => (
            <li key={slot.id}>
              <button
                type="button"
                className={selected === slot.id ? 'is-active' : undefined}
                onClick={() => selectSlot(slot.id)}
              >
                <span className="slot-panel__row-name">{slot.name}</span>
                <span className="slot-panel__row-time">{formatTimestamp(slot.savedAt)}</span>
              </button>
            </li>
          ))}
          {!atCap && (
            <li>
              <button
                type="button"
                className={selected === NEW_SLOT ? 'is-active' : undefined}
                onClick={() => selectSlot(NEW_SLOT)}
              >
                <span className="slot-panel__row-name">New slot</span>
              </button>
            </li>
          )}
        </ul>

        {atCap && (
          <p className="slot-panel__hint">
            Both save slots are full. Choose one above to overwrite it, or create an account for
            unlimited, cross-device boards.
          </p>
        )}
        {!selected && atCap && (
          <p className="slot-panel__hint">Pick a slot to overwrite before saving.</p>
        )}

        <div className="slot-panel__name">
          <label htmlFor="slot-name-input">Name</label>
          <input
            id="slot-name-input"
            type="text"
            value={name}
            maxLength={SLOT_NAME_MAX_LENGTH}
            disabled={!selected}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {error && <p className="slot-panel__error">{error}</p>}

        <div className="reset-confirm__actions">
          <button type="button" className="reset-confirm__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="reset-confirm__confirm"
            disabled={!selected || !name.trim()}
            onClick={confirm}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
