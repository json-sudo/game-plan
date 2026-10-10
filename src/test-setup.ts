import '@testing-library/jest-dom/vitest';

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
  this.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]')?.focus();
  this.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const cancel = new Event('cancel', { cancelable: true });
    this.dispatchEvent(cancel);
    if (!cancel.defaultPrevented) this.close();
  });
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};
