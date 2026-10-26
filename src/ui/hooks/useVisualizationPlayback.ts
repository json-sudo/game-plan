import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MOTION_DURATIONS_MS,
  blendScenes,
  buildTimeline,
  remapElapsedMs,
  sampleTimeline,
} from '../../engine';
import { easeProgress } from '../../engine/anim/motion';
import type { Scene } from '../../engine/anim/timeline';
import type { FmVisualization } from '../../state/visualization';
import { prefersReducedMotion, useReducedMotion } from './usePieceMotion';

export interface VisualizationPlayback {
  scene: Scene | null;
  running: boolean;
  onSettled: () => void;
}

interface Clock {
  baseMs: number;
  elapsedMs: number;
  reduced: boolean;
  running: boolean;
  blendFrom: Scene | null;
}

const WAITING: Clock = {
  baseMs: 0,
  elapsedMs: 0,
  reduced: false,
  running: false,
  blendFrom: null,
};

export function useVisualizationPlayback(
  viz: FmVisualization | null,
  restartKey: number,
): VisualizationPlayback {
  const [source, setSource] = useState({ viz, restartKey });
  const [clock, setClock] = useState<Clock>(WAITING);
  const passes = viz ? viz.frames.length - 1 : 0;
  const reducedNow = useReducedMotion();

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

  if (clock.running && timeline && clock.reduced !== reducedNow) {
    const blendFrom = sampleTimeline(timeline, clock.elapsedMs, clock.reduced);
    const baseMs = remapElapsedMs(timeline, clock.elapsedMs, clock.reduced, reducedNow);
    setClock({
      baseMs,
      elapsedMs: baseMs,
      reduced: reducedNow,
      running: true,
      blendFrom,
    });
  }

  useEffect(() => {
    if (!clock.running) return;
    let handle = 0;
    let startedAt: number | null = null;
    const frame = (timestamp: number) => {
      startedAt ??= timestamp;
      setClock((current) => ({
        ...current,
        elapsedMs: current.baseMs + timestamp - startedAt!,
      }));
      handle = requestAnimationFrame(frame);
    };
    handle = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(handle);
  }, [clock.running, clock.reduced]);

  const onSettled = useCallback(() => {
    if (passes > 0) {
      setClock((current) =>
        current.running ? current : { ...WAITING, reduced: prefersReducedMotion(), running: true },
      );
    }
  }, [passes]);

  const scene = useMemo(() => {
    if (!timeline) return null;
    const sampled = sampleTimeline(timeline, clock.elapsedMs, clock.reduced);
    if (!clock.blendFrom) return sampled;
    const blend = (clock.elapsedMs - clock.baseMs) / MOTION_DURATIONS_MS.reduced;
    return blend >= 1 ? sampled : blendScenes(clock.blendFrom, sampled, easeProgress(blend, true));
  }, [timeline, clock]);

  return { scene, running: clock.running, onSettled };
}
