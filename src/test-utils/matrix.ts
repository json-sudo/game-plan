import { FM26_DATA } from '../data/fm26';
import type { FormationDef, Point, Possession, RoleDef, Side } from '../data/types';
import type { ZoneId } from '../data/zones';
import { isRoleAllowedInSlot } from '../engine/fm/carrier-eligibility';
import { BODY_DISTANCE } from '../engine/fm/shape';
import { laneOf, thirdOf } from '../engine/fm/zones';
import type {
  Visualization,
  VisualizationFrame,
  VisualizationInput,
} from '../engine/fm/visualization';
import { PITCH_H, PITCH_W } from '../engine/geometry/pitch';

export type RoleMap = Record<string, string | undefined>;

export const FORMATIONS: readonly FormationDef[] = FM26_DATA.formations;

const EPSILON = 1e-6;
const EDGE_MARGIN = 2.4;
const ATTACKING_KEEPER_Y: readonly [number, number] = [92, 97];
const DEFENDING_KEEPER_Y: readonly [number, number] = [3, 6];
const KEEPER_CENTRE_TOLERANCE = 2;
const CARRIER_BALL_TOLERANCE = 1;
const RECEIVER_TRAVEL_LIMIT = 8;
const SUPPORT_TRAVEL_LIMIT = 10;
const ORDINARY_PASS_COUNTS = { min: 4, max: 6 };
const FLANK_OR_HALF_SPACE_PASSES = 2;
const CENTRE_FINAL_THIRD_PASSES = 1;
const MIN_DM_SLOTS_FOR_BOX_TO_BOX = 2;
const BOX_TO_BOX_ROLES = ['box_to_box_midfielder_ip', 'box_to_box_playmaker_ip'];

export function defendingSide(attacker: Side): Side {
  return attacker === 'mine' ? 'opponent' : 'mine';
}

function possessionOf(team: Side, attacker: Side): Possession {
  return team === attacker ? 'in' : 'out';
}

function defaultRole(family: string, possession: Possession): RoleDef {
  const role = FM26_DATA.roles.find(
    (candidate) =>
      candidate.possession === possession && candidate.families.some((item) => item === family),
  );
  if (!role) throw new Error(`no ${possession} role for ${family}`);
  return role;
}

export function defaultRoles(
  formations: Record<Side, FormationDef | null>,
  attacker: Side,
): RoleMap {
  return Object.fromEntries(
    (['mine', 'opponent'] as const).flatMap((team) =>
      (formations[team]?.slots ?? []).map((slot) => [
        `${team}:${slot.id}`,
        defaultRole(slot.family, possessionOf(team, attacker)).id,
      ]),
    ),
  );
}

export function availableRoles(
  formation: FormationDef,
  slotId: string,
  possession: Possession,
): RoleDef[] {
  const slot = formation.slots.find((item) => item.id === slotId)!;
  const doubleDm =
    formation.slots.filter((item) => item.family === 'DM').length >= MIN_DM_SLOTS_FOR_BOX_TO_BOX;
  return FM26_DATA.roles.filter(
    (role) =>
      role.possession === possession &&
      role.families.some((family) => family === slot.family) &&
      isRoleAllowedInSlot(role.id, slot.id, formation.slots) &&
      (!BOX_TO_BOX_ROLES.includes(role.id) || slot.family !== 'DM' || doubleDm),
  );
}

export function inputOf(
  zone: ZoneId,
  attacker: Side,
  formations: Record<Side, FormationDef | null>,
  roles: RoleMap = defaultRoles(formations, attacker),
): VisualizationInput {
  return { zone, attacker, formations, roles };
}

export function pairInput(
  zone: ZoneId,
  attack: FormationDef,
  defence: FormationDef | null,
  attacker: Side = 'mine',
): VisualizationInput {
  const formations =
    attacker === 'mine' ? { mine: attack, opponent: defence } : { mine: defence, opponent: attack };
  return inputOf(zone, attacker, formations);
}

export function describeConfig(input: VisualizationInput): string {
  return JSON.stringify({
    zone: input.zone,
    attacker: input.attacker,
    mine: input.formations.mine?.id ?? null,
    opponent: input.formations.opponent?.id ?? null,
    roles: input.roles,
  });
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function expectedPassCount(zone: ZoneId): { min: number; max: number } {
  if (thirdOf(zone) !== 'F') return ORDINARY_PASS_COUNTS;
  const exact = laneOf(zone) === 'C' ? CENTRE_FINAL_THIRD_PASSES : FLANK_OR_HALF_SPACE_PASSES;
  return { min: exact, max: exact };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function inRange(value: number, [low, high]: readonly [number, number]): boolean {
  return value >= low - EPSILON && value <= high + EPSILON;
}

function frameViolations(
  label: string,
  input: VisualizationInput,
  frame: VisualizationFrame,
): string[] {
  const found: string[] = [];
  const attacker = input.attacker;
  const defender = defendingSide(attacker);
  const expectedIds = (['mine', 'opponent'] as const).flatMap((team) =>
    (input.formations[team]?.slots ?? []).map((slot) => `${team}:${slot.id}`),
  );
  const ids = Object.keys(frame.positions);
  if (ids.length !== expectedIds.length || expectedIds.some((id) => !(id in frame.positions))) {
    found.push(`${label}: wrong player set`);
  }
  for (const id of ids) {
    const point = frame.positions[id];
    if (id.endsWith(':GK')) {
      const range = id.startsWith(attacker) ? ATTACKING_KEEPER_Y : DEFENDING_KEEPER_Y;
      if (!inRange(point.y, range)) found.push(`${label}: ${id} keeper y ${point.y.toFixed(2)}`);
      if (Math.abs(point.x - PITCH_W / 2) > KEEPER_CENTRE_TOLERANCE + EPSILON) {
        found.push(`${label}: ${id} keeper x ${point.x.toFixed(2)}`);
      }
      continue;
    }
    if (
      !inRange(point.x, [EDGE_MARGIN, PITCH_W - EDGE_MARGIN]) ||
      !inRange(point.y, [EDGE_MARGIN, PITCH_H - EDGE_MARGIN])
    ) {
      found.push(`${label}: ${id} out of bounds at ${point.x.toFixed(2)},${point.y.toFixed(2)}`);
    }
  }
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const gap = distance(frame.positions[ids[i]], frame.positions[ids[j]]);
      if (gap < BODY_DISTANCE - EPSILON) {
        found.push(`${label}: ${ids[i]} / ${ids[j]} gap ${gap.toFixed(2)}`);
      }
    }
  }
  const keeperY = frame.positions[`${defender}:GK`]?.y ?? EDGE_MARGIN;
  for (const slot of input.formations[attacker]?.slots ?? []) {
    if (slot.family === 'ST' && frame.positions[`${attacker}:${slot.id}`]?.y <= keeperY) {
      found.push(`${label}: ${attacker}:${slot.id} striker behind the opposing keeper`);
    }
  }
  return found;
}

function chainViolations(input: VisualizationInput, vis: Visualization): string[] {
  const found: string[] = [];
  const { min, max } = expectedPassCount(input.zone);
  if (vis.passes.length < min || vis.passes.length > max) {
    found.push(`${vis.starterId}: ${vis.passes.length} passes, expected ${min}-${max}`);
  }
  if (distance(vis.opening.ball, vis.opening.positions[vis.starterId]) > CARRIER_BALL_TOLERANCE) {
    found.push(`${vis.starterId}: opening ball is off the carrier`);
  }
  let carrierId = vis.starterId;
  let before = vis.opening;
  vis.passes.forEach((pass, index) => {
    const label = `${vis.starterId} pass ${index + 1}`;
    if (pass.carrierId !== carrierId) found.push(`${label}: chain broken`);
    if (pass.receiverId === pass.carrierId) found.push(`${label}: self pass`);
    if (!pass.receiverId.startsWith(input.attacker) || pass.receiverId.endsWith(':GK')) {
      found.push(`${label}: receiver ${pass.receiverId} is not an attacking outfield player`);
    }
    if (distance(pass.frame.ball, pass.frame.positions[pass.receiverId]) > EPSILON) {
      found.push(`${label}: ball is not on the receiver`);
    }
    const travel = (id: string) => distance(before.positions[id], pass.frame.positions[id]);
    if (travel(pass.receiverId) > RECEIVER_TRAVEL_LIMIT + EPSILON) {
      found.push(`${label}: receiver travels ${travel(pass.receiverId).toFixed(2)}`);
    }
    for (const id of Object.keys(pass.frame.positions)) {
      if (id !== pass.receiverId && travel(id) > SUPPORT_TRAVEL_LIMIT + EPSILON) {
        found.push(`${label}: ${id} travels ${travel(id).toFixed(2)}`);
      }
    }
    carrierId = pass.receiverId;
    before = pass.frame;
  });
  return found;
}

export function violationsOf(input: VisualizationInput, vis: Visualization): string[] {
  const frames = [vis.opening, ...vis.passes.map((pass) => pass.frame)];
  return [
    ...frames.flatMap((frame, index) =>
      frameViolations(`${vis.starterId} frame ${index}`, input, frame),
    ),
    ...chainViolations(input, vis),
  ];
}
