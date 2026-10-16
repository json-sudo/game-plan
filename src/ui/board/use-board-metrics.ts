import { useEffect, useMemo, useState } from 'react';
import { boardMetrics, type BoardMetrics } from './board-metrics';

interface Viewport {
  width: number;
  height: number;
}

function readViewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useBoardMetrics(): BoardMetrics {
  const [viewport, setViewport] = useState<Viewport>(readViewport);

  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return useMemo(() => boardMetrics(viewport.width, viewport.height), [viewport]);
}
