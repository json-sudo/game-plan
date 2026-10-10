import { Modal } from './Modal';
import { useBoardDispatch } from '../../board/useBoard';

export function ResetConfirmModal({ onClose }: { onClose: () => void }) {
  const dispatch = useBoardDispatch();

  const confirm = () => {
    dispatch({ type: 'RESET_BOARD' });
    onClose();
  };

  return (
    <Modal label="Reset board" className="formation-modal" onClose={onClose}>
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
    </Modal>
  );
}
