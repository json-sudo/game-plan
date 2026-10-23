import type { ReactNode } from 'react';
import type { Side } from '../../../data/types';
import { ATTACKING_TAG, DEFENDING_TAG } from '../../copy';
import styles from './pitch-frame.module.scss';

export interface PitchFrameProps {
  attacking: Side;
  mine: string;
  opponent: string;
  inset?: boolean;
  solo?: boolean;
  notice?: string;
  children?: ReactNode;
}

function TeamRow({
  side,
  name,
  attacking,
  placement,
}: {
  side: Side;
  name: string;
  attacking: boolean;
  placement?: 'top' | 'bottom';
}) {
  const isMine = side === 'mine';
  const rowClass = placement ? `${styles.row} ${styles[`row--${placement}`]}` : styles.row;
  return (
    <div role="group" aria-label={name} className={rowClass}>
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

export function PitchFrame({
  attacking,
  mine,
  opponent,
  inset = false,
  solo = false,
  notice,
  children,
}: PitchFrameProps) {
  const defending: Side = attacking === 'mine' ? 'opponent' : 'mine';
  const names: Record<Side, string> = { mine, opponent };
  const plate = notice ? <div className={styles.notice}>{notice}</div> : null;
  const defendingRow = (placement?: 'top' | 'bottom') =>
    solo ? null : (
      <TeamRow side={defending} name={names[defending]} attacking={false} placement={placement} />
    );
  if (inset) {
    return (
      <div className={styles.inset} data-inset="true">
        {children}
        {defendingRow('top')}
        <TeamRow side={attacking} name={names[attacking]} attacking placement="bottom" />
        {plate}
      </div>
    );
  }
  return (
    <div className={styles.frame}>
      {defendingRow()}
      {children}
      <TeamRow side={attacking} name={names[attacking]} attacking />
      {plate}
    </div>
  );
}
