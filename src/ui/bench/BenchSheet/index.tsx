import { useEffect, type RefObject } from 'react';
import { BENCH_CLOSE_LABEL, BENCH_HEADING } from '../../copy';
import { Button } from '../../controls/Button';
import { useModalDialog } from '../../hooks/useModalDialog';
import { Bench, type BenchProps } from '../Bench';
import { SquadControls, type SquadControlsProps } from '../SquadControls';
import styles from './bench-sheet.module.scss';

export interface BenchSheetProps
  extends Pick<BenchProps, 'pieces' | 'placed' | 'onPlace'>, SquadControlsProps {
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}

export function BenchSheet({
  pieces,
  placed,
  teams,
  onSquadSize,
  onKeeper,
  onPlace,
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
      <SquadControls teams={teams} onSquadSize={onSquadSize} onKeeper={onKeeper} />
      <Bench sheet pieces={pieces} placed={placed} onPlace={onPlace} />
    </dialog>
  );
}
