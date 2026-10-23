import type { StoreApi } from 'zustand';
import type { PitchStore } from '../../../state/store';
import { SETUP_SHEET_LABEL } from '../../copy';
import { useModalDialog } from '../../hooks/useModalDialog';
import { SetupFlow } from '../SetupFlow';
import styles from './setup-sheet.module.scss';

export interface SetupSheetProps {
  store: StoreApi<PitchStore>;
  onClose: () => void;
}

export function SetupSheet({ store, onClose }: SetupSheetProps) {
  const { dialogRef } = useModalDialog(onClose);
  return (
    <dialog ref={dialogRef} className={styles.sheet} aria-label={SETUP_SHEET_LABEL}>
      <SetupFlow store={store} phone onClose={onClose} />
    </dialog>
  );
}
