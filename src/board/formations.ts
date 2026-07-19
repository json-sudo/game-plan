import { PITCH_W, PITCH_H } from '../components/Pitch';

export interface FormationSlot {
  label: string;
  x: number;
  y: number;
}

export interface Formation {
  name: string;
  slots: FormationSlot[];
}

const CX = PITCH_W / 2;

export const FORMATIONS: Formation[] = [
  {
    name: '4-3-3',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'LB', x: 10, y: 80 },
      { label: 'CB', x: 28, y: 82 },
      { label: 'CB', x: 48, y: 82 },
      { label: 'RB', x: 66, y: 80 },
      { label: 'CM', x: 20, y: 67 },
      { label: 'DM', x: CX, y: 69 },
      { label: 'CM', x: 56, y: 67 },
      { label: 'LW', x: 12, y: 56 },
      { label: 'ST', x: CX, y: 54 },
      { label: 'RW', x: 64, y: 56 },
    ],
  },
  {
    name: '4-4-2',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'LB', x: 10, y: 80 },
      { label: 'CB', x: 28, y: 82 },
      { label: 'CB', x: 48, y: 82 },
      { label: 'RB', x: 66, y: 80 },
      { label: 'LM', x: 10, y: 66 },
      { label: 'CM', x: 28, y: 68 },
      { label: 'CM', x: 48, y: 68 },
      { label: 'RM', x: 66, y: 66 },
      { label: 'ST', x: 28, y: 55 },
      { label: 'ST', x: 48, y: 55 },
    ],
  },
  {
    name: '3-5-2',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'CB', x: 20, y: 82 },
      { label: 'CB', x: CX, y: 83 },
      { label: 'CB', x: 56, y: 82 },
      { label: 'LWB', x: 8, y: 68 },
      { label: 'CM', x: 24, y: 69 },
      { label: 'CM', x: CX, y: 71 },
      { label: 'CM', x: 52, y: 69 },
      { label: 'RWB', x: 68, y: 68 },
      { label: 'ST', x: 28, y: 55 },
      { label: 'ST', x: 48, y: 55 },
    ],
  },
  {
    name: '4-2-3-1',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'LB', x: 10, y: 80 },
      { label: 'CB', x: 28, y: 82 },
      { label: 'CB', x: 48, y: 82 },
      { label: 'RB', x: 66, y: 80 },
      { label: 'DM', x: 28, y: 72 },
      { label: 'DM', x: 48, y: 72 },
      { label: 'LW', x: 12, y: 61 },
      { label: 'AM', x: CX, y: 63 },
      { label: 'RW', x: 64, y: 61 },
      { label: 'ST', x: CX, y: 53 },
    ],
  },
  {
    name: '5-3-2',
    slots: [
      { label: 'GK', x: CX, y: 94 },
      { label: 'LWB', x: 8, y: 78 },
      { label: 'CB', x: 22, y: 82 },
      { label: 'CB', x: CX, y: 83 },
      { label: 'CB', x: 54, y: 82 },
      { label: 'RWB', x: 68, y: 78 },
      { label: 'CM', x: 22, y: 68 },
      { label: 'CM', x: CX, y: 70 },
      { label: 'CM', x: 54, y: 68 },
      { label: 'ST', x: 28, y: 55 },
      { label: 'ST', x: 48, y: 55 },
    ],
  },
];

export function mirrorSlot(slot: FormationSlot): { x: number; y: number } {
  return { x: PITCH_W - slot.x, y: PITCH_H - slot.y };
}

// Engagement offset for matchup placement, tuned by eye against the reference layout.
export const MATCHUP_OFFSET = 30;

export function standardPlacement(slot: FormationSlot, team: 'mine' | 'opponent') {
  return team === 'mine' ? { x: slot.x, y: slot.y } : mirrorSlot(slot);
}

export function matchupAttackerPlacement(
  slot: FormationSlot,
  team: 'mine' | 'opponent',
  isKeeper: boolean,
): { x: number; y: number } {
  const base = standardPlacement(slot, team);
  if (isKeeper) return base;
  return { x: base.x, y: team === 'mine' ? base.y - MATCHUP_OFFSET : base.y + MATCHUP_OFFSET };
}

export function getFormation(name: string): Formation | undefined {
  return FORMATIONS.find((f) => f.name === name);
}

// Piece render radius (see src/components/Pitch/index.tsx) plus a small visual gap.
const PIECE_RADIUS = 2.2;
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

// Pushes attacker points off of any defender point they've landed within MIN_SEP of.
// Each iteration sums the per-defender "push away by the shortfall" vectors for a piece
// (rather than jumping straight to MIN_SEP from a single defender), so a piece squeezed
// between two defenders resolves against both instead of oscillating between them. When a
// defender sits exactly on the attacker's x (or the two points coincide), the push direction
// is nudged sideways by a small deterministic amount so pieces trapped on a vertical line
// between two defenders (whose combined radii don't fit in the gap) can drift off-axis to a
// feasible point instead of bouncing between two single-defender solutions. Defenders never move.
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
