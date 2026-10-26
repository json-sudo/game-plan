import type { Point } from '../../data/types';
import { MOTION_DURATIONS_MS, easeProgress } from './motion';
import { planPaths, pathPointAt, type Frame, type PlayerPath } from './paths';

export const PASS_SETTLE_MS = 250;

const GLYPH_UNITS = {
  player: 4.4,
  ball: 2.1,
  gap: 0.3,
  stroke: 0.15,
} as const;

export const ATTACHMENT_OFFSET =
  (GLYPH_UNITS.player + GLYPH_UNITS.ball) / 2 + GLYPH_UNITS.gap + GLYPH_UNITS.stroke;

export interface TimelinePass {
  carrierId: string;
  receiverId: string;
}

export interface TimelineInput {
  starterId: string;
  frames: readonly Frame[];
  passes: readonly TimelinePass[];
}

interface Move {
  carrierFrom: string;
  carrierTo: string;
  paths: ReadonlyMap<string, PlayerPath>;
}

export interface Timeline {
  frames: readonly Frame[];
  starterId: string;
  carriers: readonly string[];
  moves: readonly Move[];
  returnMove: Move;
}

export interface Scene {
  positions: Record<string, Point>;
  ball: Point;
}

type Segment =
  | { kind: 'move'; move: Move; durationMs: number }
  | { kind: 'hold'; frameIndex: number; durationMs: number };

export function buildTimeline({ starterId, frames, passes }: TimelineInput): Timeline {
  const carriers = [starterId, ...passes.map((pass) => pass.receiverId)];
  const moves = passes.map((pass, index): Move => ({
    carrierFrom: pass.carrierId,
    carrierTo: pass.receiverId,
    paths: planPaths(frames[index], frames[index + 1], pass.receiverId),
  }));
  const last = frames.length - 1;
  return {
    frames,
    starterId,
    carriers,
    moves,
    returnMove: {
      carrierFrom: carriers[last],
      carrierTo: starterId,
      paths: planPaths(frames[last], frames[0], starterId),
    },
  };
}

export function attachedBall(carrier: Point): Point {
  return { x: carrier.x, y: carrier.y - ATTACHMENT_OFFSET };
}

function segmentsOf(timeline: Timeline, reduced: boolean): Segment[] {
  const durationMs = reduced ? MOTION_DURATIONS_MS.reduced : MOTION_DURATIONS_MS.phase;
  const last = timeline.moves.length;
  const passes = timeline.moves.flatMap((move, index): Segment[] => [
    { kind: 'move', move, durationMs },
    index < last - 1
      ? { kind: 'hold', frameIndex: index + 1, durationMs: PASS_SETTLE_MS }
      : { kind: 'hold', frameIndex: last, durationMs: MOTION_DURATIONS_MS.cadence },
  ]);
  return [
    ...passes,
    { kind: 'move', move: timeline.returnMove, durationMs },
    { kind: 'hold', frameIndex: 0, durationMs: PASS_SETTLE_MS },
  ];
}

export function timelineDurationMs(timeline: Timeline, reduced: boolean): number {
  return segmentsOf(timeline, reduced).reduce((sum, segment) => sum + segment.durationMs, 0);
}

function holdScene(timeline: Timeline, frameIndex: number): Scene {
  const positions = { ...timeline.frames[frameIndex] };
  return { positions, ball: attachedBall(positions[timeline.carriers[frameIndex]]) };
}

function moveScene({ paths, carrierFrom, carrierTo }: Move, progress: number): Scene {
  const positions = Object.fromEntries(
    [...paths].map(([id, path]) => [id, pathPointAt(path, progress)]),
  );
  const from = attachedBall(paths.get(carrierFrom)!.from);
  const to = attachedBall(paths.get(carrierTo)!.to);
  return {
    positions,
    ball: { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress },
  };
}

export function remapElapsedMs(
  timeline: Timeline,
  elapsedMs: number,
  from: boolean,
  to: boolean,
): number {
  if (timeline.moves.length === 0 || from === to) return elapsedMs;
  const fromSegments = segmentsOf(timeline, from);
  const toSegments = segmentsOf(timeline, to);
  const total = timelineDurationMs(timeline, from);
  let remaining = ((elapsedMs % total) + total) % total;
  let mapped = 0;
  const last = fromSegments.length - 1;
  for (let index = 0; ; index += 1) {
    const duration = fromSegments[index].durationMs;
    if (remaining < duration || index === last) {
      return mapped + (remaining / duration) * toSegments[index].durationMs;
    }
    remaining -= duration;
    mapped += toSegments[index].durationMs;
  }
}

export function blendScenes(from: Scene, to: Scene, progress: number): Scene {
  const mix = (a: Point, b: Point): Point => ({
    x: a.x + (b.x - a.x) * progress,
    y: a.y + (b.y - a.y) * progress,
  });
  return {
    positions: Object.fromEntries(
      Object.entries(to.positions).map(([id, point]) => [
        id,
        mix(from.positions[id] ?? point, point),
      ]),
    ),
    ball: mix(from.ball, to.ball),
  };
}

export function sampleTimeline(timeline: Timeline, elapsedMs: number, reduced: boolean): Scene {
  if (timeline.moves.length === 0) return holdScene(timeline, 0);
  const segments = segmentsOf(timeline, reduced);
  const total = timelineDurationMs(timeline, reduced);
  let remaining = ((elapsedMs % total) + total) % total;
  for (const segment of segments) {
    if (remaining < segment.durationMs) {
      return segment.kind === 'hold'
        ? holdScene(timeline, segment.frameIndex)
        : moveScene(segment.move, easeProgress(remaining / segment.durationMs, reduced));
    }
    remaining -= segment.durationMs;
  }
  return holdScene(timeline, 0);
}
