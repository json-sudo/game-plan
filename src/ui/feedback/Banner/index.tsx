import type { ReactNode } from 'react';
import { Button } from '../../controls/Button';
import { Icon } from '../../controls/Icon';
import styles from './banner.module.scss';

export interface BannerProps {
  tone?: 'error' | 'info';
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  onDismiss?: (() => void) | null;
}

export function Banner({ tone = 'info', title, children, actions, onDismiss }: BannerProps) {
  return (
    <div className={styles.banner} data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={styles.icon}>
        <Icon name={tone === 'error' ? 'alert' : 'info'} />
      </span>
      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        {children ? <div className={styles.text}>{children}</div> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {onDismiss !== undefined ? (
        <Button
          variant="icon"
          size="sm"
          icon="close"
          label="Dismiss"
          onClick={onDismiss ?? undefined}
        />
      ) : null}
    </div>
  );
}
