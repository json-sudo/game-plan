import { useShareLinkError } from '../../board/BoardContext';

export function ShareLinkErrorBanner() {
  const [hasError, dismiss] = useShareLinkError();
  if (!hasError) return null;
  return (
    <div className="top-bar__banner" role="alert">
      <span>This link couldn't be opened — it may be broken or from an unsupported version.</span>
      <button type="button" aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}
