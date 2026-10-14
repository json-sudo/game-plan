import type { Side } from '../../../data/types';
import { TOKEN_TEAM_LABELS } from '../../copy';
import styles from './bench-chip.module.scss';

export interface BenchPiece {
  id: string;
  label: string;
  team: Side;
  keeper?: boolean;
  name?: string;
}

export type BenchChipProps = Omit<BenchPiece, 'id'>;

export function BenchChip({ label, team, keeper = false, name }: BenchChipProps) {
  const accessibleName = [label, name, TOKEN_TEAM_LABELS[team]].filter(Boolean).join(', ');

  return (
    <button type="button" className={styles.chip} aria-label={accessibleName}>
      <span
        className={styles.mark}
        data-team={team}
        data-keeper={keeper || undefined}
        aria-hidden="true"
      />
      <span className={styles.text}>{name || label}</span>
    </button>
  );
}
