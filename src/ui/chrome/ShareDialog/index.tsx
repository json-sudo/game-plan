import { useEffect, useId, useRef, useState } from 'react';
import {
  SHARE_COPIED,
  SHARE_DONE_LABEL,
  SHARE_HINT,
  SHARE_LABEL,
  SHARE_LINK_LABEL,
} from '../../copy';
import { Button } from '../../controls/Button';
import { Icon } from '../../controls/Icon';
import { Dialog } from '../../feedback/Dialog';
import styles from './share-dialog.module.scss';

export interface ShareDialogProps {
  link: string;
  onClose: () => void;
}

export function ShareDialog({ link, onClose }: ShareDialogProps) {
  const fieldId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let current = true;
    navigator.clipboard.writeText(link).then(
      () => {
        if (current) setCopied(true);
      },
      () => {
        if (current) field.current?.select();
      },
    );
    return () => {
      current = false;
    };
  }, [link]);

  return (
    <Dialog
      title={SHARE_LABEL}
      onClose={onClose}
      footer={
        <Button variant="ghost" onClick={onClose}>
          {SHARE_DONE_LABEL}
        </Button>
      }
    >
      <div className={styles.field}>
        <label htmlFor={fieldId} className={styles.label}>
          {SHARE_LINK_LABEL}
        </label>
        <input ref={field} id={fieldId} className={styles.input} value={link} readOnly />
      </div>
      {copied ? (
        <div className={styles.status}>
          <span className={styles.chip}>
            <Icon name="check" />
            {SHARE_COPIED}
          </span>
          <span className={styles.hint}>{SHARE_HINT}</span>
        </div>
      ) : null}
    </Dialog>
  );
}
