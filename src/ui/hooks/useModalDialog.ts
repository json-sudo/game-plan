import { useEffect, useRef } from 'react';

export function useModalDialog(onClose?: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let pressedOnBackdrop = false;

    const requestClose = (event: Event) => {
      event.preventDefault();
      onCloseRef.current?.();
    };
    const trackPress = (event: Event) => {
      pressedOnBackdrop = event.target === dialog;
    };
    const closeOnBackdrop = (event: Event) => {
      if (pressedOnBackdrop && event.target === dialog) onCloseRef.current?.();
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
  }, []);

  return dialogRef;
}
