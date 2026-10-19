import type { PointerEvent } from 'react';
import type { Side } from '../../../data/types';
import { BENCH_CHIP_HINT, TOKEN_TEAM_LABELS } from '../../copy';
import styles from './bench-chip.module.scss';

export interface BenchPiece {
  id: string;
  label: string;
  team: Side;
  keeper?: boolean;
  name?: string;
  order: number;
}

export type BenchChipProps = Omit<BenchPiece, 'id' | 'order'> & {
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPlace?: () => void;
};

export function BenchChip({
  label,
  team,
  keeper = false,
  name,
  onPointerDown,
  onPlace,
}: BenchChipProps) {
  const accessibleName = [label, name, TOKEN_TEAM_LABELS[team]].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      className={styles.chip}
      aria-label={accessibleName}
      title={onPlace ? BENCH_CHIP_HINT : undefined}
      onPointerDown={onPointerDown}
      onClick={onPlace}
    >
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
