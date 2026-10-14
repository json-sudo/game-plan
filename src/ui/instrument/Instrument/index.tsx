import type { ReactNode } from 'react';
import styles from './instrument.module.scss';

export interface InstrumentProps {
  children: ReactNode;
}

export function Instrument({ children }: InstrumentProps) {
  return (
    <div data-instrument className={styles.instrument}>
      {children}
    </div>
  );
}
