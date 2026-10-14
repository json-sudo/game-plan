import { useEffect, type RefObject } from 'react';
import { SQUAD_SIZES, type SquadSize } from '../../../state/document';
import {
  BENCH_CLOSE_LABEL,
  BENCH_HEADING,
  KEEPER_TOGGLE_LABEL,
  SQUAD_SIZE_LABEL,
} from '../../copy';
import { Button } from '../../controls/Button';
import { SegmentedControl } from '../../controls/SegmentedControl';
import { Toggle } from '../../controls/Toggle';
import { useModalDialog } from '../../hooks/useModalDialog';
import { Bench, type BenchProps } from '../Bench';
import styles from './bench-sheet.module.scss';

const SQUAD_OPTIONS = SQUAD_SIZES.map((size) => ({ value: String(size), label: String(size) }));

export interface BenchSheetProps extends Pick<BenchProps, 'pieces' | 'placed'> {
  squadSize: SquadSize;
  keeper: boolean;
  onSquadSize: (size: SquadSize) => void;
  onKeeper: (keeper: boolean) => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}

function squadSizeOf(value: string): SquadSize | undefined {
  return SQUAD_SIZES.find((size) => String(size) === value);
}

export function BenchSheet({
  pieces,
  placed,
  squadSize,
  keeper,
  onSquadSize,
  onKeeper,
  onClose,
  returnFocus,
}: BenchSheetProps) {
  const { dialogRef, dismiss } = useModalDialog(onClose);

  useEffect(() => {
    const target = returnFocus;
    return () => target.current?.querySelector('button')?.focus();
  }, [returnFocus]);

  return (
    <dialog ref={dialogRef} className={styles.sheet} aria-label={BENCH_HEADING}>
      <div className={styles.head}>
        <Button variant="icon" icon="close" label={BENCH_CLOSE_LABEL} onClick={dismiss} />
      </div>
      <div className={styles.controls}>
        <SegmentedControl
          label={SQUAD_SIZE_LABEL}
          showLabel
          value={String(squadSize)}
          options={SQUAD_OPTIONS}
          onChange={(value) => {
            const size = squadSizeOf(value);
            if (size) onSquadSize(size);
          }}
        />
        <Toggle label={KEEPER_TOGGLE_LABEL} checked={keeper} onChange={onKeeper} />
      </div>
      <Bench sheet pieces={pieces} placed={placed} />
    </dialog>
  );
}
