import { useCallback, useEffect, useState } from 'react';
import { MOTION_DURATIONS_MS, motionDurationMs } from '../../engine';
import type { FmVisualization } from '../../state/visualization';
import { prefersReducedMotion } from './usePieceMotion';

type Step =
  | { kind: 'waiting' }
  | { kind: 'pass'; pass: number }
  | { kind: 'glide'; pass: number }
  | { kind: 'hold' }
  | { kind: 'back' };

export interface VisualizationPlayback {
  piecesFrame: number;
  ballFrame: number;
  onSettled: () => void;
}

const WAITING: Step = { kind: 'waiting' };
const FIRST_PASS: Step = { kind: 'pass', pass: 1 };

function stepDelayMs(step: Step): number {
  const reduced = prefersReducedMotion();
  if (step.kind === 'hold') return MOTION_DURATIONS_MS.cadence;
  return motionDurationMs(step.kind === 'pass' ? 'piece' : 'phase', reduced);
}

function nextStep(step: Step, passes: number): Step {
  switch (step.kind) {
    case 'pass':
      return { kind: 'glide', pass: step.pass };
    case 'glide':
      return step.pass < passes ? { kind: 'pass', pass: step.pass + 1 } : { kind: 'hold' };
    case 'hold':
      return { kind: 'back' };
    default:
      return FIRST_PASS;
  }
}

function framesOf(step: Step, last: number): { piecesFrame: number; ballFrame: number } {
  switch (step.kind) {
    case 'pass':
      return { piecesFrame: step.pass - 1, ballFrame: step.pass };
    case 'glide':
      return { piecesFrame: step.pass, ballFrame: step.pass };
    case 'hold':
      return { piecesFrame: last, ballFrame: last };
    default:
      return { piecesFrame: 0, ballFrame: 0 };
  }
}

export function useVisualizationPlayback(
  viz: FmVisualization | null,
  restartKey: number,
): VisualizationPlayback {
  const [source, setSource] = useState({ viz, restartKey });
  const [step, setStep] = useState<Step>(WAITING);
  const passes = viz ? viz.frames.length - 1 : 0;

  if (source.viz !== viz || source.restartKey !== restartKey) {
    setSource({ viz, restartKey });
    setStep(WAITING);
  }

  useEffect(() => {
    if (step.kind === 'waiting') return;
    const timer = setTimeout(
      () => setStep((current) => nextStep(current, passes)),
      stepDelayMs(step),
    );
    return () => clearTimeout(timer);
  }, [step, passes]);

  const onSettled = useCallback(() => {
    if (passes > 0) setStep((current) => (current.kind === 'waiting' ? FIRST_PASS : current));
  }, [passes]);

  return { ...framesOf(step, passes), onSettled };
}
