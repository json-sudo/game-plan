import {
  VISUALIZATION_ANOTHER_LABEL,
  VISUALIZATION_RESTART_LABEL,
  VISUALIZATION_SINGLE_REASON,
  startsWithLine,
} from '../../copy';
import { Button } from '../../controls/Button';
import styles from './sequence-controls.module.scss';

export interface SequenceControlsProps {
  starter?: string;
  total?: number;
  onRestart?: () => void;
  onAnother?: () => void;
  disabled?: boolean;
  reason?: string;
  phone?: boolean;
}

export function SequenceControls({
  starter,
  total = 1,
  onRestart,
  onAnother,
  disabled = false,
  reason,
  phone = false,
}: SequenceControlsProps) {
  const size = phone ? 'lg' : undefined;
  const single = !disabled && total <= 1;

  return (
    <div className={styles.controls} data-phone={phone || undefined}>
      {!disabled && starter ? <p className={styles.starts}>{startsWithLine(starter)}</p> : null}
      <div className={styles.buttons}>
        <Button
          variant="secondary"
          size={size}
          icon="back"
          disabled={disabled}
          disabledReason={reason}
          onClick={onRestart}
        >
          {VISUALIZATION_RESTART_LABEL}
        </Button>
        <Button
          variant="secondary"
          size={size}
          icon="next"
          disabled={disabled || single}
          disabledReason={disabled ? reason : VISUALIZATION_SINGLE_REASON}
          onClick={onAnother}
        >
          {VISUALIZATION_ANOTHER_LABEL}
        </Button>
      </div>
    </div>
  );
}
