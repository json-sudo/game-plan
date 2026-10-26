import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildTimeline, sampleTimeline } from '../../engine';
import type { Scene } from '../../engine/anim/timeline';
import type { FmVisualization } from '../../state/visualization';
import { prefersReducedMotion } from './usePieceMotion';

export interface VisualizationPlayback {
  scene: Scene | null;
  running: boolean;
  onSettled: () => void;
}

interface Clock {
  elapsedMs: number;
  reduced: boolean;
  running: boolean;
}

const WAITING: Clock = { elapsedMs: 0, reduced: false, running: false };

export function useVisualizationPlayback(
  viz: FmVisualization | null,
  restartKey: number,
): VisualizationPlayback {
  const [source, setSource] = useState({ viz, restartKey });
  const [clock, setClock] = useState<Clock>(WAITING);
  const passes = viz ? viz.frames.length - 1 : 0;

  if (source.viz !== viz || source.restartKey !== restartKey) {
    setSource({ viz, restartKey });
    setClock(WAITING);
  }

  const timeline = useMemo(
    () =>
      viz
        ? buildTimeline({
            starterId: viz.starterId,
            frames: viz.frames.map((f) => f.positions),
            passes: viz.passes,
          })
        : null,
    [viz],
  );

  useEffect(() => {
    if (!clock.running) return;
    let handle = 0;
    let startedAt: number | null = null;
    const frame = (timestamp: number) => {
      startedAt ??= timestamp;
      setClock((current) => ({ ...current, elapsedMs: timestamp - startedAt! }));
      handle = requestAnimationFrame(frame);
    };
    handle = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(handle);
  }, [clock.running]);

  const onSettled = useCallback(() => {
    if (passes > 0) {
      setClock((current) =>
        current.running
          ? current
          : { elapsedMs: 0, reduced: prefersReducedMotion(), running: true },
      );
    }
  }, [passes]);

  const scene = useMemo(
    () => (timeline ? sampleTimeline(timeline, clock.elapsedMs, clock.reduced) : null),
    [timeline, clock.elapsedMs, clock.reduced],
  );

  return { scene, running: clock.running, onSettled };
}
