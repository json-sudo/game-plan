import { useCallback, useEffect, useRef } from 'react';

export function useModalDialog(onClose?: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const dismiss = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (onCloseRef.current) onCloseRef.current();
    else dialog.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let pressedOnBackdrop = false;

    const requestClose = (event: Event) => {
      event.preventDefault();
      dismiss();
    };
    const trackPress = (event: Event) => {
      pressedOnBackdrop = event.target === dialog;
    };
    const closeOnBackdrop = (event: Event) => {
      if (pressedOnBackdrop && event.target === dialog) dismiss();
      pressedOnBackdrop = false;
    };

    dialog.addEventListener('cancel', requestClose);
    dialog.addEventListener('pointerdown', trackPress);
    dialog.addEventListener('click', closeOnBackdrop);
    dialog.showModal();

    return () => {
      dialog.removeEventListener('cancel', requestClose);
      dialog.removeEventListener('pointerdown', trackPress);
      dialog.removeEventListener('click', closeOnBackdrop);
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [dismiss]);

  return { dialogRef, dismiss };
}
