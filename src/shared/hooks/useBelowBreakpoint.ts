import { useEffect, useState } from 'react';

export function useBelowBreakpoint(px: number): boolean {
  const query = `(max-width: ${px - 0.02}px)`;
  const [isBelow, setIsBelow] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsBelow(mql.matches);
    onChange();
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [query]);

  return isBelow;
}
