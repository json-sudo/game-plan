import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({
  label,
  className,
  onClose,
  children,
}: {
  label: string;
  className: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();

    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const onBackdropClick = (e: MouseEvent) => {
      if (e.target === dialog) onClose();
    };
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('click', onBackdropClick);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('click', onBackdropClick);
    };
  }, [onClose]);

  return (
    <dialog ref={dialogRef} className={className} aria-label={label}>
      {children}
    </dialog>
  );
}
