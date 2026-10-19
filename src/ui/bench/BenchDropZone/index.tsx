import type { Ref } from 'react';
import { BENCH_DROP_LABEL } from '../../copy';
import styles from './bench-drop-zone.module.scss';

export interface BenchDropZoneProps {
  over?: boolean;
  dropRef?: Ref<HTMLElement>;
}

export function BenchDropZone({ over = false, dropRef }: BenchDropZoneProps) {
  return (
    <section ref={dropRef} className={styles.zone} data-bench-drop data-over={over || undefined}>
      {BENCH_DROP_LABEL}
    </section>
  );
}
