import type { ReactNode } from 'react';
import type { Side } from '../../../data/types';
import { ATTACKING_TAG, DEFENDING_TAG } from '../../copy';
import styles from './pitch-frame.module.scss';

export interface PitchFrameProps {
  attacking: Side;
  mine: string;
  opponent: string;
  children?: ReactNode;
}

function TeamRow({ side, name, attacking }: { side: Side; name: string; attacking: boolean }) {
  const isMine = side === 'mine';
  return (
    <div role="group" aria-label={name} className={styles.row}>
      <span
        data-mark={isMine ? 'circle' : 'square'}
        className={isMine ? styles.circle : styles.square}
        aria-hidden="true"
      />
      <span className={styles.name}>{name}</span>
      <span className={attacking ? `${styles.tag} ${styles['tag--attacking']}` : styles.tag}>
        {attacking ? ATTACKING_TAG : DEFENDING_TAG}
      </span>
    </div>
  );
}

export function PitchFrame({ attacking, mine, opponent, children }: PitchFrameProps) {
  const defending: Side = attacking === 'mine' ? 'opponent' : 'mine';
  const names: Record<Side, string> = { mine, opponent };
  return (
    <div className={styles.frame}>
      <TeamRow side={defending} name={names[defending]} attacking={false} />
      {children}
      <TeamRow side={attacking} name={names[attacking]} attacking />
    </div>
  );
}
