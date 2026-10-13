import { useId, type ReactNode } from 'react';
import { Button } from '../../controls/Button';
import { useModalDialog } from '../../hooks/useModalDialog';
import styles from './dialog.module.scss';

export interface DialogProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  inline?: boolean;
}

interface PanelProps extends DialogProps {
  titleId: string;
}

function Panel({ title, titleId, children, footer, onClose }: PanelProps) {
  return (
    <>
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {onClose ? <Button variant="icon" icon="close" label="Close" onClick={onClose} /> : null}
      </div>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.foot}>{footer}</div> : null}
    </>
  );
}

function InlineDialog(props: DialogProps) {
  const titleId = useId();
  return (
    <div className={styles.panel} role="dialog" aria-labelledby={titleId}>
      <Panel {...props} titleId={titleId} />
    </div>
  );
}

function ModalDialog(props: DialogProps) {
  const titleId = useId();
  const { dialogRef, dismiss } = useModalDialog(props.onClose);
  return (
    <dialog ref={dialogRef} className={styles.modal} aria-labelledby={titleId}>
      <div className={styles.panel}>
        <Panel {...props} titleId={titleId} onClose={props.onClose ?? dismiss} />
      </div>
    </dialog>
  );
}

export function Dialog(props: DialogProps) {
  return props.inline ? <InlineDialog {...props} /> : <ModalDialog {...props} />;
}
