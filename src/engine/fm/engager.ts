import type { Point, Side } from '../../data/types';
import type { Third, ZoneId } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import type { Anchor, SlotLine } from './formation-anchors';
import type { FmPlayer } from './player';
import { FLANK } from './role-regions';
import { thirdOf } from './zones';

export interface EngagerInput {
  attacker: Side;
  zone: ZoneId;
  players: readonly FmPlayer[];
  carrier: Point;
}

export interface Engagement {
  anchors: Map<string, Anchor>;
  engagerId: string | null;
}

const CENTRE_X = PITCH_W / 2;
const SIDE_TOLERANCE = 0.5;
const STOPPING_CENTRE_BACK = 'stopping_centre_back_oop';
const SCREENING_PREFIX = 'screening_';
const PRESSING_ROLE = /^(pressing|tracking)_/;

const ENGAGE_OFFSET = 5.5;
const ENGAGE_DEPTH = 4.8;
const PRESSING_BONUS = 3;
const TARGET_LINE_GAP = 12.5;
const MAX_LINE_SHIFT = 6;

const ENGAGING_LINES: Record<Third, readonly SlotLine[]> = {
  M: ['WM', 'WA', 'CM', 'AM', 'DM'],
  F: ['FB', 'WB', 'DM'],
  D: ['ST', 'AM', 'WA'],
};
const BACK_LINES: readonly SlotLine[] = ['CB', 'FB', 'WB'];
const SCREEN_LINES: readonly SlotLine[] = ['DM', 'CM', 'WM'];

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isSuitable(player: FmPlayer, line: SlotLine, third: Third): boolean {
  if (player.roleId === STOPPING_CENTRE_BACK) return true;
  return line !== 'CB' && ENGAGING_LINES[third].includes(line);
}

function rankOf(player: FmPlayer, anchor: Anchor, carrier: Point): number {
  const pressing = PRESSING_ROLE.test(player.roleId ?? '') ? PRESSING_BONUS : 0;
  const screening = player.roleId?.startsWith(SCREENING_PREFIX) ? 1 : 0;
  return screening * 1000 + distance(anchor.point, carrier) - pressing;
}

function attackWeightX(anchors: ReadonlyMap<string, Anchor>, input: EngagerInput): number {
  const attackers = input.players.filter(
    (player) => player.team === input.attacker && !player.isKeeper,
  );
  return (
    attackers.reduce((sum, player) => sum + anchors.get(player.id)!.point.x, 0) /
    Math.max(attackers.length, 1)
  );
}

function chooseEngager(
  anchors: ReadonlyMap<string, Anchor>,
  input: EngagerInput,
  defenders: readonly FmPlayer[],
  weightX: number,
): FmPlayer | null {
  const third = thirdOf(input.zone);
  const suitable = defenders.filter((player) =>
    isSuitable(player, anchors.get(player.id)!.line, third),
  );
  const pool = suitable.length > 0 ? suitable : defenders.filter((p) => p.family !== 'D(C)');
  const towardWeight = (player: FmPlayer) => Math.abs(anchors.get(player.id)!.point.x - weightX);
  return (
    [...pool].sort(
      (a, b) =>
        rankOf(a, anchors.get(a.id)!, input.carrier) -
          rankOf(b, anchors.get(b.id)!, input.carrier) ||
        towardWeight(a) - towardWeight(b) ||
        a.id.localeCompare(b.id),
    )[0] ?? null
  );
}

function engageTarget(anchor: Point, carrier: Point, weightX: number): Point {
  const away = anchor.x - carrier.x;
  const preferred =
    Math.abs(away) >= SIDE_TOLERANCE
      ? Math.sign(away)
      : Math.sign(CENTRE_X - carrier.x) || Math.sign(weightX - carrier.x) || 1;
  const fits = (sign: number) => {
    const x = carrier.x + sign * ENGAGE_OFFSET;
    return x >= FLANK && x <= PITCH_W - FLANK;
  };
  const sign = fits(preferred) ? preferred : -preferred;
  return { x: carrier.x + sign * ENGAGE_OFFSET, y: carrier.y - ENGAGE_DEPTH };
}

function compactLines(
  anchors: ReadonlyMap<string, Anchor>,
  movable: readonly string[],
): Map<string, Anchor> {
  const lineOf = (id: string) => anchors.get(id)!.line;
  const back = movable.filter((id) => BACK_LINES.includes(lineOf(id)));
  const screen = movable.filter((id) => SCREEN_LINES.includes(lineOf(id)));
  if (back.length === 0 || screen.length === 0) return new Map(anchors);
  const meanY = (ids: readonly string[]) =>
    ids.reduce((sum, id) => sum + anchors.get(id)!.point.y, 0) / ids.length;
  const gap = meanY(screen) - meanY(back);
  const shift = Math.max(-MAX_LINE_SHIFT, Math.min(MAX_LINE_SHIFT, TARGET_LINE_GAP - gap));
  const shifted = new Set(screen);
  return new Map(
    [...anchors].map(([id, anchor]): [string, Anchor] =>
      shifted.has(id)
        ? [id, { ...anchor, point: { ...anchor.point, y: anchor.point.y + shift } }]
        : [id, anchor],
    ),
  );
}

export function engageCarrier(
  anchors: ReadonlyMap<string, Anchor>,
  input: EngagerInput,
): Engagement {
  const defenders = input.players.filter(
    (player) => player.team !== input.attacker && !player.isKeeper,
  );
  const weightX = attackWeightX(anchors, input);
  const engager = chooseEngager(anchors, input, defenders, weightX);
  if (!engager) return { anchors: new Map(anchors), engagerId: null };
  const target = engageTarget(anchors.get(engager.id)!.point, input.carrier, weightX);
  const placed = new Map(anchors).set(engager.id, {
    ...anchors.get(engager.id)!,
    point: target,
  });
  const movable = defenders.filter((player) => player.id !== engager.id).map((player) => player.id);
  return { anchors: compactLines(placed, movable), engagerId: engager.id };
}
