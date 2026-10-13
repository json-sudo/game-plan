import type { ReactNode } from 'react';
import styles from './slot-list-item.module.scss';

export interface SlotListItemProps {
  slot: number;
  name?: string;
  meta?: string;
  empty?: boolean;
  emptyLabel?: string;
  selected?: boolean;
  trailing?: ReactNode;
  onClick?: () => void;
}

const DEFAULT_EMPTY_LABEL = 'Empty slot';

export function SlotListItem({
  slot,
  name,
  meta,
  empty = false,
  emptyLabel = DEFAULT_EMPTY_LABEL,
  selected = false,
  trailing,
  onClick,
}: SlotListItemProps) {
  const body = (
    <>
      <span className={styles.number} aria-hidden="true">
        {slot}
      </span>
      <span className={styles.text}>
        <span className={styles.name}>
          <span className={styles.prefix}>Slot {slot}:</span> {empty ? emptyLabel : name}
        </span>{' '}
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </span>
    </>
  );

  return (
    <div className={styles.slot} data-empty={empty}>
      {onClick ? (
        <button type="button" className={styles.main} aria-pressed={selected} onClick={onClick}>
          {body}
        </button>
      ) : (
        <div className={styles.main} aria-current={selected || undefined}>
          {body}
        </div>
      )}
      {trailing}
    </div>
  );
}
