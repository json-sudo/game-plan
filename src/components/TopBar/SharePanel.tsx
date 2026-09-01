import { useEffect, useRef, useState } from 'react';

export function SharePanel({ url, onClose }: { url: string; onClose: () => void }) {
  const [copyState, setCopyState] = useState<'pending' | 'copied' | 'failed'>('pending');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.select();
    if (!navigator.clipboard?.writeText) {
      setCopyState('failed');
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => setCopyState('copied'),
      () => setCopyState('failed'),
    );
  }, [url]);

  return (
    <div className="formation-modal__backdrop" onClick={onClose}>
      <div
        className="slot-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Share board"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="formation-modal__header">
          <h2>Share Board</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <p className="slot-panel__hint">
          {copyState === 'copied'
            ? 'Link copied to clipboard.'
            : 'Copy this link to share your board:'}
        </p>

        <div className="slot-panel__name">
          <label htmlFor="share-url-input">Link</label>
          <input
            id="share-url-input"
            ref={inputRef}
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      </div>
    </div>
  );
}
