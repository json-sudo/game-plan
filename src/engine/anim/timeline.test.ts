import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { Family, FormationDef, RoleDef, Side } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { distance } from '../fm/point';
import { visualizationsFor, type Visualization } from '../fm/visualization';
import { MOTION_DURATIONS_MS, easeProgress } from './motion';
import {
  ATTACHMENT_OFFSET,
  PASS_SETTLE_MS,
  attachedBall,
  buildTimeline,
  sampleTimeline,
  timelineDurationMs,
  type Timeline,
} from './timeline';

const MOVE = MOTION_DURATIONS_MS.phase;
const REDUCED_MOVE = MOTION_DURATIONS_MS.reduced;
const HOLD = MOTION_DURATIONS_MS.cadence;
const CYCLE = MOVE + PASS_SETTLE_MS;
const BODY_SEPARATION = 4.65;
const SAMPLE_STEP_MS = 10;
const ZONES: ZoneId[] = ['LH-D', 'C-D', 'LH-M', 'C-M', 'RH-M', 'LH-F', 'C-F'];

function formationById(id: string): FormationDef {
  const found = FM26_DATA.formations.find((formation) => formation.id === id);
  if (!found) throw new Error(`no formation ${id}`);
  return found;
}

function firstRole(family: Family, possession: 'in' | 'out'): RoleDef {
  const role = FM26_DATA.roles.find(
    (candidate) =>
      candidate.possession === possession && candidate.families.some((item) => item === family),
  );
  if (!role) throw new Error(`no ${possession} role for ${family}`);
  return role;
}

function rolesFor(formation: FormationDef, team: Side, possession: 'in' | 'out') {
  return Object.fromEntries(
    formation.slots
      .filter((slot) => slot.family !== 'GK')
      .map((slot) => [`${team}:${slot.id}`, firstRole(slot.family, possession).id]),
  );
}

function visualizationAt(zone: ZoneId): Visualization {
  const mine = formationById('4_3_3_dm_wide');
  const opponent = formationById('4_2_3_1_dm_wide');
  return visualizationsFor({
    zone,
    attacker: 'mine',
    formations: { mine, opponent },
    roles: { ...rolesFor(mine, 'mine', 'in'), ...rolesFor(opponent, 'opponent', 'out') },
  })[0];
}

function timelineOf(viz: Visualization): Timeline {
  return buildTimeline({
    starterId: viz.starterId,
    frames: [viz.opening, ...viz.passes.map((pass) => pass.frame)].map((frame) => frame.positions),
    passes: viz.passes,
  });
}

const VIZ = visualizationAt('LH-M');
const TIMELINE = timelineOf(VIZ);
const PASSES = VIZ.passes.length;
const FINAL_ARRIVAL = (PASSES - 1) * CYCLE + MOVE;
const TOTAL = timelineDurationMs(TIMELINE, false);

function carriers(): string[] {
  return [VIZ.starterId, ...VIZ.passes.map((pass) => pass.receiverId)];
}

function minimumGap(timeline: Timeline): number {
  let minimum = Infinity;
  for (let at = 0; at < timelineDurationMs(timeline, false); at += SAMPLE_STEP_MS) {
    const points = Object.values(sampleTimeline(timeline, at, false).positions);
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        minimum = Math.min(minimum, distance(points[a], points[b]));
      }
    }
  }
  return minimum;
}

describe('sampleTimeline', () => {
  it('plans several passes', () => {
    expect(PASSES).toBeGreaterThanOrEqual(4);
  });

  it('sums passes, a 1600 ms hold, a 900 ms return and a 250 ms settle', () => {
    expect(TOTAL).toBe(FINAL_ARRIVAL + HOLD + MOVE + PASS_SETTLE_MS);
  });

  it('starts at the opening with the ball attached once above the starter', () => {
    const scene = sampleTimeline(TIMELINE, 0, false);
    const starter = VIZ.opening.positions[VIZ.starterId];
    expect(scene.positions).toEqual(VIZ.opening.positions);
    expect(scene.ball.x).toBeCloseTo(starter.x, 9);
    expect(starter.y - scene.ball.y).toBeCloseTo(ATTACHMENT_OFFSET, 9);
  });

  it.each([0.25, 0.5, 0.75])('interpolates the ball and players on one clock at %s', (share) => {
    const scene = sampleTimeline(TIMELINE, MOVE * share, false);
    const eased = easeProgress(share, false);
    const { receiverId, frame } = VIZ.passes[0];
    const from = attachedBall(VIZ.opening.positions[VIZ.starterId]);
    const to = attachedBall(frame.positions[receiverId]);
    expect(scene.ball.x).toBeCloseTo(from.x + (to.x - from.x) * eased, 6);
    expect(scene.ball.y).toBeCloseTo(from.y + (to.y - from.y) * eased, 6);
    const start = VIZ.opening.positions[receiverId];
    const end = frame.positions[receiverId];
    const travelled = distance(start, scene.positions[receiverId]) / distance(start, end);
    expect(travelled).toBeGreaterThan(0);
    expect(travelled).toBeLessThan(1);
  });

  it('puts the receiver at its point exactly when the ball attaches to it', () => {
    const scene = sampleTimeline(TIMELINE, MOVE, false);
    const { receiverId, frame } = VIZ.passes[0];
    expect(scene.positions).toEqual(frame.positions);
    expect(scene.ball).toEqual(attachedBall(frame.positions[receiverId]));
  });

  it('settles for 250 ms after a pass before the next one starts', () => {
    const { positions } = VIZ.passes[0].frame;
    expect(sampleTimeline(TIMELINE, CYCLE - 1, false).positions).toEqual(positions);
    expect(sampleTimeline(TIMELINE, CYCLE + MOVE / 2, false).positions).not.toEqual(positions);
  });

  it('holds 1600 ms after the final pass, returns over 900 ms, settles and wraps', () => {
    const last = VIZ.passes[PASSES - 1].frame.positions;
    expect(sampleTimeline(TIMELINE, FINAL_ARRIVAL, false).positions).toEqual(last);
    expect(sampleTimeline(TIMELINE, FINAL_ARRIVAL + HOLD - 1, false).positions).toEqual(last);
    expect(sampleTimeline(TIMELINE, FINAL_ARRIVAL + HOLD + MOVE / 2, false).positions).not.toEqual(
      last,
    );
    const returned = sampleTimeline(TIMELINE, FINAL_ARRIVAL + HOLD + MOVE, false);
    expect(returned.positions).toEqual(VIZ.opening.positions);
    expect(returned.ball).toEqual(attachedBall(VIZ.opening.positions[VIZ.starterId]));
    expect(sampleTimeline(TIMELINE, TOTAL - 1, false).positions).toEqual(VIZ.opening.positions);
    expect(sampleTimeline(TIMELINE, TOTAL, false)).toEqual(sampleTimeline(TIMELINE, 0, false));
    expect(sampleTimeline(TIMELINE, TOTAL + MOVE / 2, false)).toEqual(
      sampleTimeline(TIMELINE, MOVE / 2, false),
    );
  });

  it('attaches the ball to the sampled carrier outside passes and keeps identities', () => {
    const ids = Object.keys(VIZ.opening.positions).sort();
    carriers()
      .slice(1)
      .forEach((id, index) => {
        const start = index * CYCLE + MOVE;
        const end = index + 1 < PASSES ? (index + 1) * CYCLE : FINAL_ARRIVAL + HOLD;
        for (let at = start; at < end; at += SAMPLE_STEP_MS) {
          const scene = sampleTimeline(TIMELINE, at, false);
          expect(Object.keys(scene.positions).sort()).toEqual(ids);
          expect(scene.ball).toEqual(attachedBall(scene.positions[id]));
        }
      });
  });

  it('uses 200 ms moves with the same endpoints under reduced motion', () => {
    const total = (PASSES - 1) * (REDUCED_MOVE + PASS_SETTLE_MS) + REDUCED_MOVE + HOLD;
    expect(timelineDurationMs(TIMELINE, true)).toBe(total + REDUCED_MOVE + PASS_SETTLE_MS);
    const arrival = sampleTimeline(TIMELINE, REDUCED_MOVE, true);
    expect(arrival.positions).toEqual(VIZ.passes[0].frame.positions);
    expect(sampleTimeline(TIMELINE, REDUCED_MOVE / 2, true).positions).not.toEqual(
      arrival.positions,
    );
  });
});

describe('player paths', () => {
  it.each(ZONES)('keeps the contract body gap at every sampled instant from %s', (zone) => {
    expect(minimumGap(timelineOf(visualizationAt(zone)))).toBeGreaterThanOrEqual(
      BODY_SEPARATION - 0.05,
    );
  });

  it('detours or delays a crossing run without swapping identities', () => {
    const frame = { a: { x: 10, y: 50 }, b: { x: 30, y: 50 }, c: { x: 50, y: 20 } };
    const next = { ...frame, a: { x: 30, y: 50 }, b: { x: 10, y: 50 } };
    const timeline = buildTimeline({
      starterId: 'c',
      frames: [frame, next],
      passes: [{ carrierId: 'c', receiverId: 'a' }],
    });
    let minimum = Infinity;
    for (let at = 0; at <= MOVE; at += SAMPLE_STEP_MS) {
      const { positions } = sampleTimeline(timeline, at, false);
      minimum = Math.min(minimum, distance(positions.a, positions.b));
    }
    expect(minimum).toBeGreaterThanOrEqual(BODY_SEPARATION - 0.05);
    const arrived = sampleTimeline(timeline, MOVE, false).positions;
    expect(arrived.a).toEqual(next.a);
    expect(arrived.b).toEqual(next.b);
  });
});
