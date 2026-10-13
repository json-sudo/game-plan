import { REDO_DISABLED_REASON, UNDO_DISABLED_REASON } from '../../copy';
import { Button } from '../../controls/Button';
import styles from './undo-control.module.scss';

export interface UndoControlProps {
  canUndo?: boolean;
  canRedo?: boolean;
  undoLabel?: string;
  redo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function UndoControl({
  canUndo = false,
  canRedo = false,
  undoLabel = 'Undo',
  redo = true,
  onUndo,
  onRedo,
}: UndoControlProps) {
  return (
    <div className={styles.group} role="group" aria-label="History">
      <Button
        variant="icon"
        icon="undo"
        label="Undo"
        tooltip={canUndo ? undoLabel : undefined}
        disabled={!canUndo}
        disabledReason={canUndo ? undefined : UNDO_DISABLED_REASON}
        onClick={onUndo}
      />
      {redo ? (
        <Button
          variant="icon"
          icon="redo"
          label="Redo"
          tooltip={canRedo ? 'Redo' : undefined}
          disabled={!canRedo}
          disabledReason={canRedo ? undefined : REDO_DISABLED_REASON}
          onClick={onRedo}
        />
      ) : null}
    </div>
  );
}
