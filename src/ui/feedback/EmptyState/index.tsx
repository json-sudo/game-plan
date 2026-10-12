import type { ReactNode } from 'react';
import styles from './empty-state.module.scss';

export interface EmptyStateProps {
  title: string;
  children?: ReactNode;
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {children ? <p className={styles.help}>{children}</p> : null}
    </div>
  );
}
