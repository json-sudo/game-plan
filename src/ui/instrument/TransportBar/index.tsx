import {
  BACK_AT_SHAPE_HINT,
  NEXT_AT_FINAL_HINT,
  TRANSPORT_BACK_LABEL,
  TRANSPORT_NEXT_LABEL,
  TRANSPORT_PAUSE_LABEL,
  TRANSPORT_PHASE_LABELS,
  TRANSPORT_PLAYING_STATUS,
  TRANSPORT_PLAY_LABEL,
  transportStatus,
} from '../../copy';
import { Button } from '../../controls/Button';
import styles from './transport-bar.module.scss';

export interface TransportBarProps {
  phase?: 0 | 1 | 2;
  playing?: boolean;
  onPhase?: (phase: number) => void;
  onTogglePlay?: () => void;
  phone?: boolean;
}

const LAST_PHASE = TRANSPORT_PHASE_LABELS.length - 1;

function dotState(index: number, phase: number) {
  if (index === phase) return 'current';
  return index < phase ? 'passed' : 'upcoming';
}

export function TransportBar({
  phase = 0,
  playing = false,
  onPhase,
  onTogglePlay,
  phone = false,
}: TransportBarProps) {
  const size = phone ? 'lg' : undefined;
  const atShape = phase === 0;
  const atFinal = phase === LAST_PHASE;

  return (
    <div className={styles.bar} data-phone={phone}>
      <div className={styles.controls}>
        <Button
          variant="secondary"
          size={size}
          icon="back"
          disabled={atShape}
          disabledReason={BACK_AT_SHAPE_HINT}
          onClick={() => onPhase?.(phase - 1)}
        >
          {TRANSPORT_BACK_LABEL}
        </Button>
        <Button variant="ink" size={size} icon={playing ? 'pause' : 'play'} onClick={onTogglePlay}>
          {playing ? TRANSPORT_PAUSE_LABEL : TRANSPORT_PLAY_LABEL}
        </Button>
        <Button
          variant="secondary"
          size={size}
          icon="next"
          disabled={atFinal}
          disabledReason={NEXT_AT_FINAL_HINT}
          onClick={() => onPhase?.(phase + 1)}
        >
          {TRANSPORT_NEXT_LABEL}
        </Button>
      </div>
      <div className={styles.track}>
        <ol className={styles.dots}>
          {TRANSPORT_PHASE_LABELS.map((label, index) => (
            <li key={label} className={styles.step} data-passed={index <= phase || undefined}>
              <button
                type="button"
                className={styles.dot}
                data-state={dotState(index, phase)}
                aria-current={index === phase ? 'step' : undefined}
                onClick={() => onPhase?.(index)}
              >
                <span className={styles.mark} aria-hidden="true" />
                <span className={styles.label}>{label}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className={styles.status} role="status">
          {playing ? TRANSPORT_PLAYING_STATUS : transportStatus(phase)}
        </p>
      </div>
    </div>
  );
}
