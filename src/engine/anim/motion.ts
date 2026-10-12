export const MOTION_DURATIONS_MS = {
  phase: 900,
  piece: 320,
  reduced: 200,
  cadence: 1600,
} as const;

export type MotionKind = 'phase' | 'piece';

export type CubicBezier = readonly [x1: number, y1: number, x2: number, y2: number];

export const MOTION_EASING: Record<'standard' | 'reduced', CubicBezier> = {
  standard: [0.3, 0, 0.2, 1],
  reduced: [0, 0, 0.58, 1],
};

const SOLVER_ITERATIONS = 24;

export function motionDurationMs(kind: MotionKind, reducedMotion: boolean): number {
  return reducedMotion ? MOTION_DURATIONS_MS.reduced : MOTION_DURATIONS_MS[kind];
}

function bezierAt(a: number, b: number, t: number): number {
  const u = 1 - t;
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
}

export function cubicBezierAt(curve: CubicBezier, progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  const [x1, y1, x2, y2] = curve;
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < SOLVER_ITERATIONS; step += 1) {
    const mid = (lo + hi) / 2;
    if (bezierAt(x1, x2, mid) < progress) lo = mid;
    else hi = mid;
  }
  return bezierAt(y1, y2, (lo + hi) / 2);
}

export function easeProgress(progress: number, reducedMotion: boolean): number {
  const curve = reducedMotion ? MOTION_EASING.reduced : MOTION_EASING.standard;
  return cubicBezierAt(curve, progress);
}
