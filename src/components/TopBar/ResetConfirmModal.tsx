import { useEffect, type MouseEvent } from 'react';
import { useBoardDispatch } from '../../board/BoardContext';

export function ResetConfirmModal({ onClose }: { onClose: () => void }) {
  const dispatch = useBoardDispatch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const confirm = () => {
    dispatch({ type: 'RESET_BOARD' });
    onClose();
  };

  const dismissOnBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="formation-modal__backdrop" role="presentation" onClick={dismissOnBackdrop}>
      <div className="formation-modal" role="dialog" aria-modal="true" aria-label="Reset board">
        <header className="formation-modal__header">
          <h2>Reset Board</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <p className="reset-confirm__message">
          Reset everything? Squads return to 11, keepers off, labels and formations cleared. This
          cannot be undone.
        </p>
        <div className="reset-confirm__actions">
          <button type="button" className="reset-confirm__cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="reset-confirm__confirm" onClick={confirm}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
