import { PITCH_W, PITCH_H } from './pitchGeometry';

export const PIECE_RADIUS = 2.2;
export const MIN_SEP = PIECE_RADIUS * 2 + 1.6;

const CLAMP_MARGIN = 1;
const MAX_SEPARATION_ITERATIONS = 40;
const COLLINEAR_EPSILON = 1e-6;
const COLLINEAR_BIAS = 1e-2;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export interface SeparationPoint {
  id: string;
  x: number;
  y: number;
}

export function separateFromDefenders(
  attackers: SeparationPoint[],
  defenders: SeparationPoint[],
  attackerOwnHalfIsLargerY: boolean,
): Map<string, { x: number; y: number }> {
  const positions = new Map(attackers.map((a) => [a.id, { x: a.x, y: a.y }]));
  const pushSign = attackerOwnHalfIsLargerY ? 1 : -1;

  for (let iter = 0; iter < MAX_SEPARATION_ITERATIONS; iter++) {
    let anyMoved = false;
    attackers.forEach((a, index) => {
      const pos = positions.get(a.id)!;
      const bias = (index % 2 === 0 ? COLLINEAR_BIAS : -COLLINEAR_BIAS) * pushSign;
      let pushX = 0;
      let pushY = 0;
      let violated = false;
      for (const d of defenders) {
        let dx = pos.x - d.x;
        const dy = pos.y - d.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= MIN_SEP) continue;
        violated = true;
        if (dist === 0) {
          pushX += bias;
          pushY += pushSign * MIN_SEP;
          continue;
        }
        if (Math.abs(dx) < COLLINEAR_EPSILON) dx = bias;
        const effDist = Math.hypot(dx, dy);
        const shortfall = MIN_SEP - dist;
        pushX += (dx / effDist) * shortfall;
        pushY += (dy / effDist) * shortfall;
      }
      if (!violated) return;
      pos.x = clamp(pos.x + pushX, CLAMP_MARGIN, PITCH_W - CLAMP_MARGIN);
      pos.y = clamp(pos.y + pushY, CLAMP_MARGIN, PITCH_H - CLAMP_MARGIN);
      anyMoved = true;
    });
    if (!anyMoved) break;
  }

  return positions;
}

export interface MovablePoint extends SeparationPoint {
  weight: number;
}

export function separateMutually(
  movable: MovablePoint[],
  anchors: SeparationPoint[],
): Map<string, { x: number; y: number }> {
  const positions = new Map(movable.map((m) => [m.id, { x: m.x, y: m.y }]));
  const weights = new Map(movable.map((m) => [m.id, m.weight]));

  for (let iter = 0; iter < MAX_SEPARATION_ITERATIONS; iter++) {
    const snapshot = new Map(Array.from(positions, ([id, p]) => [id, { x: p.x, y: p.y }]));
    const pushes = new Map(movable.map((m) => [m.id, { x: 0, y: 0 }]));
    let anyViolated = false;

    movable.forEach((m, index) => {
      const pos = snapshot.get(m.id)!;
      const bias = index % 2 === 0 ? COLLINEAR_BIAS : -COLLINEAR_BIAS;
      const push = pushes.get(m.id)!;
      for (const a of anchors) {
        let dx = pos.x - a.x;
        const dy = pos.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= MIN_SEP) continue;
        anyViolated = true;
        if (dist === 0) {
          push.x += bias;
          push.y += MIN_SEP;
          continue;
        }
        if (Math.abs(dx) < COLLINEAR_EPSILON) dx = bias;
        const effDist = Math.hypot(dx, dy);
        const shortfall = MIN_SEP - dist;
        push.x += (dx / effDist) * shortfall;
        push.y += (dy / effDist) * shortfall;
      }
    });

    for (let i = 0; i < movable.length; i++) {
      for (let j = i + 1; j < movable.length; j++) {
        const m1 = movable[i];
        const m2 = movable[j];
        const p1 = snapshot.get(m1.id)!;
        const p2 = snapshot.get(m2.id)!;
        let dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= MIN_SEP) continue;
        anyViolated = true;

        const w1 = weights.get(m1.id)!;
        const w2 = weights.get(m2.id)!;
        const share1 = w2 / (w1 + w2);
        const share2 = w1 / (w1 + w2);
        const bias = (i + j) % 2 === 0 ? COLLINEAR_BIAS : -COLLINEAR_BIAS;
        const push1 = pushes.get(m1.id)!;
        const push2 = pushes.get(m2.id)!;

        if (dist === 0) {
          push1.x += bias * share1;
          push1.y += MIN_SEP * share1;
          push2.x -= bias * share2;
          push2.y -= MIN_SEP * share2;
          continue;
        }
        if (Math.abs(dx) < COLLINEAR_EPSILON) dx = bias;
        const effDist = Math.hypot(dx, dy);
        const shortfall = MIN_SEP - dist;
        const ux = dx / effDist;
        const uy = dy / effDist;
        push1.x += ux * shortfall * share1;
        push1.y += uy * shortfall * share1;
        push2.x -= ux * shortfall * share2;
        push2.y -= uy * shortfall * share2;
      }
    }

    if (!anyViolated) break;

    for (const m of movable) {
      const pos = positions.get(m.id)!;
      const push = pushes.get(m.id)!;
      pos.x = clamp(pos.x + push.x, CLAMP_MARGIN, PITCH_W - CLAMP_MARGIN);
      pos.y = clamp(pos.y + push.y, CLAMP_MARGIN, PITCH_H - CLAMP_MARGIN);
    }
  }

  return positions;
}
