import type { PointerEvent, Ref } from 'react';
import {
  BENCH_DROP_LABEL,
  BENCH_EMPTY_HINT,
  BENCH_EMPTY_TITLE,
  BENCH_HEADING,
  benchCount,
} from '../../copy';
import { EmptyState } from '../../feedback/EmptyState';
import { BenchChip, type BenchPiece } from '../BenchChip';
import styles from './bench.module.scss';

export interface BenchProps {
  pieces: BenchPiece[];
  placed: number;
  dropping?: boolean;
  sheet?: boolean;
  benchRef?: Ref<HTMLElement>;
  onChipPointerDown?: (id: string) => (event: PointerEvent<HTMLButtonElement>) => void;
}

function compareBenchPieces(a: BenchPiece, b: BenchPiece): number {
  if (Boolean(a.keeper) !== Boolean(b.keeper)) return a.keeper ? -1 : 1;
  if (a.order !== b.order) return a.order - b.order;
  if (a.team !== b.team) return a.team === 'mine' ? -1 : 1;
  return 0;
}

export function Bench({
  pieces,
  placed,
  dropping = false,
  sheet = false,
  benchRef,
  onChipPointerDown,
}: BenchProps) {
  const ordered = [...pieces].sort(compareBenchPieces);
  const showEmpty = ordered.length === 0 && !dropping;

  return (
    <section ref={benchRef} className={styles.bench} data-sheet={sheet || undefined}>
      <h2 className={styles.heading}>{BENCH_HEADING}</h2>
      <p className={styles.count}>{benchCount(placed, ordered.length)}</p>
      {showEmpty ? (
        <EmptyState title={BENCH_EMPTY_TITLE}>{BENCH_EMPTY_HINT}</EmptyState>
      ) : (
        <ul className={styles.grid}>
          {dropping ? <li className={styles.drop}>{BENCH_DROP_LABEL}</li> : null}
          {ordered.map((piece) => (
            <li key={piece.id}>
              <BenchChip
                label={piece.label}
                team={piece.team}
                keeper={piece.keeper}
                name={piece.name}
                onPointerDown={onChipPointerDown?.(piece.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
