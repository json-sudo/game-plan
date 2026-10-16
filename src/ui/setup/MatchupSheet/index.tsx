import { useEffect, type RefObject } from 'react';
import type { StoreApi } from 'zustand';
import { useModalDialog } from '../../hooks/useModalDialog';
import type { PitchStore } from '../../../state/store';
import { MATCHUP_CLOSE_LABEL, MATCHUP_HEADING } from '../../copy';
import { Button } from '../../controls/Button';
import { MatchupStep } from '../MatchupStep';
import styles from './matchup-sheet.module.scss';

export interface MatchupSheetProps {
  store: StoreApi<PitchStore>;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}

export function MatchupSheet({ store, onClose, returnFocus }: MatchupSheetProps) {
  const { dialogRef, dismiss } = useModalDialog(onClose);

  useEffect(() => {
    const target = returnFocus;
    return () => target.current?.querySelector('button')?.focus();
  }, [returnFocus]);

  return (
    <dialog ref={dialogRef} className={styles.sheet} aria-label={MATCHUP_HEADING}>
      <div className={styles.head}>
        <Button variant="icon" icon="close" label={MATCHUP_CLOSE_LABEL} onClick={dismiss} />
      </div>
      <MatchupStep store={store} />
    </dialog>
  );
}
