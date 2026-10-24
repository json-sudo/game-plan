import type { Family, Point, Side } from '../../data/types';
import type { Third, ZoneId } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import type { FmPlayer } from './player';
import { applyInteractions, edgeX, type InteractionEntry } from './role-interactions';
import {
  HALF_SPACE,
  depths,
  profileOf,
  type Depths,
  type LateralRule,
  type RoleProfile,
} from './role-regions';
import { laneOf, laneSignOf, thirdOf, toDisplayFrame } from './zones';

export type SlotLine = 'GK' | 'CB' | 'FB' | 'WB' | 'DM' | 'CM' | 'WM' | 'AM' | 'WA' | 'ST';

export interface Anchor {
  point: Point;
  line: SlotLine;
}

export interface AnchorInput {
  attacker: Side;
  players: readonly FmPlayer[];
  zone: ZoneId;
}

type OutfieldLine = Exclude<SlotLine, 'GK'>;
type CentralLine = 'CB' | 'DM' | 'CM' | 'AM' | 'ST';
type Sign = -1 | 0 | 1;

interface Columns {
  pair: readonly [number, number];
  triple: readonly [number, number, number];
}

interface Entry {
  player: FmPlayer;
  frameBase: Point;
  attacking: boolean;
  slotLine: SlotLine;
  line: SlotLine;
  baseSide: Sign;
  profile: RoleProfile | undefined;
}

interface Context {
  ballSign: Sign;
  splitGroups: ReadonlyMap<Side, readonly string[]>;
}

const CENTRE_X = PITCH_W / 2;
const CENTRE_TOLERANCE = 0.5;
const WIDE_ATTACKER_MAX_EDGE_DISTANCE = 17;
const KEEPER_SHIFT_SHARE = 0.2;
const ATTACKING_KEEPER_DEPTH = 96;
const DEFENDING_KEEPER_DEPTH = 4;
const INSIDE_FULL_BACK = 'inside_full_back_ip';
const HALF_BACK = 'half_back_ip';
const DROPPING_DEFENSIVE_MIDFIELDER = 'dropping_defensive_midfielder_oop';
const INSIDE_FULL_BACK_NEIGHBOUR_X = 29;

const ATTACK_DEPTH: Record<OutfieldLine, Depths> = {
  CB: depths(84, 66, 49),
  FB: depths(74, 55, 39),
  WB: depths(70, 49, 27),
  DM: depths(71, 59, 45),
  CM: depths(63, 44, 32),
  WM: depths(63, 44, 32),
  AM: depths(57, 38, 27),
  WA: depths(54, 36, 23),
  ST: depths(48, 30, 21),
};

const DEFEND_DEPTH: Record<OutfieldLine, Depths> = {
  CB: depths(42, 24, 12),
  FB: depths(42, 24, 14),
  WB: depths(46, 28, 18),
  DM: depths(54, 36, 25),
  CM: depths(60, 43, 32),
  WM: depths(60, 43, 32),
  AM: depths(63, 44, 34),
  WA: depths(61, 44, 30),
  ST: depths(77, 58, 40),
};

const ATTACK_COLUMNS: Record<CentralLine, Columns> = {
  CB: { pair: [25, 51.19], triple: [20, CENTRE_X, 56.19] },
  DM: { pair: [27, 49.19], triple: [22, CENTRE_X, 54.19] },
  CM: { pair: [24, 52.19], triple: [22, CENTRE_X, 54.19] },
  AM: { pair: [25, 51.19], triple: [22, CENTRE_X, 54.19] },
  ST: { pair: [30, 46.19], triple: [24, CENTRE_X, 52.19] },
};

const DEFEND_COLUMNS: Record<CentralLine, Columns> = {
  CB: { pair: [30, 46.19], triple: [24, CENTRE_X, 52.19] },
  DM: { pair: [27, 49.19], triple: [22, CENTRE_X, 54.19] },
  CM: { pair: [27, 49.19], triple: [23, CENTRE_X, 53.19] },
  AM: { pair: [29, 47.19], triple: [23, CENTRE_X, 53.19] },
  ST: { pair: [31, 45.19], triple: [24, CENTRE_X, 52.19] },
};

const ATTACK_LANE_SHIFT = { centre: 0, halfSpace: 1.5, flank: 3 };
const DEFEND_LANE_SHIFT = { centre: 0, halfSpace: 3, flank: 5 };

const ATTACK_WIDE_X = 10;
const ATTACK_FINAL_WIDE_ATTACKER_X = 14;
const DEFEND_WIDE_X = 16;
const DEFEND_FINAL_WIDE_X = 17;
const DEFEND_WING_BACK_X = 12;

export function slotLineOf(family: Family, frameX: number): SlotLine {
  switch (family) {
    case 'GK':
      return 'GK';
    case 'D(C)':
      return 'CB';
    case 'D(L)':
    case 'D(R)':
      return 'FB';
    case 'WB(L)':
    case 'WB(R)':
      return 'WB';
    case 'DM':
      return 'DM';
    case 'M(C)':
      return 'CM';
    case 'M(L)':
    case 'M(R)':
      return 'WM';
    case 'AM(C)':
      return 'AM';
    case 'AM(L)':
    case 'AM(R)':
      return Math.min(frameX, PITCH_W - frameX) < WIDE_ATTACKER_MAX_EDGE_DISTANCE ? 'WA' : 'AM';
    case 'ST':
      return 'ST';
  }
}

function isCentral(line: SlotLine): line is CentralLine {
  return line === 'CB' || line === 'DM' || line === 'CM' || line === 'AM' || line === 'ST';
}

function laneShiftOf(zone: ZoneId, attacking: boolean): number {
  const table = attacking ? ATTACK_LANE_SHIFT : DEFEND_LANE_SHIFT;
  const lane = laneOf(zone);
  const size =
    lane === 'C' ? table.centre : lane === 'LH' || lane === 'RH' ? table.halfSpace : table.flank;
  return size * laneSignOf(zone);
}

function wideX(line: OutfieldLine, attacking: boolean, third: Third): number {
  if (attacking) {
    return line === 'WA' && third === 'F' ? ATTACK_FINAL_WIDE_ATTACKER_X : ATTACK_WIDE_X;
  }
  if (line === 'WB') return DEFEND_WING_BACK_X;
  return third === 'F' && (line === 'FB' || line === 'WA') ? DEFEND_FINAL_WIDE_X : DEFEND_WIDE_X;
}

function centralX(columns: Columns, count: number, index: number, fallback: number): number {
  if (count === 1) return CENTRE_X;
  if (count === 2) return columns.pair[index];
  if (count === 3) return columns.triple[index];
  return fallback;
}

function backLineX(
  columns: Columns,
  count: number,
  index: number,
  insideBacks: { left: boolean; right: boolean },
): number {
  if (count === 1) return CENTRE_X;
  const [low, high] = count === 2 ? columns.pair : [columns.triple[0], columns.triple[2]];
  const left = insideBacks.left ? Math.max(low, INSIDE_FULL_BACK_NEIGHBOUR_X) : low;
  const right = insideBacks.right ? Math.min(high, PITCH_W - INSIDE_FULL_BACK_NEIGHBOUR_X) : high;
  if (count === 2) return index === 0 ? left : right;
  if (count === 3) return [left, CENTRE_X, right][index];
  return left + (index * (right - left)) / (count - 1);
}

function keeperDepth(attacking: boolean, profile: RoleProfile | undefined): number {
  if (profile && 'D' in profile.y) return profile.y.D;
  return attacking ? ATTACKING_KEEPER_DEPTH : DEFENDING_KEEPER_DEPTH;
}

function signOf(delta: number): Sign {
  if (Math.abs(delta) < CENTRE_TOLERANCE) return 0;
  return delta < 0 ? -1 : 1;
}

function effectiveLine(slotLine: SlotLine, roleId: string | undefined, third: Third): SlotLine {
  if (roleId === HALF_BACK) return 'CB';
  if (roleId === DROPPING_DEFENSIVE_MIDFIELDER && third === 'F') return 'CB';
  return slotLine;
}

function entryOf(attacker: Side, third: Third, player: FmPlayer): Entry {
  const frameBase = toDisplayFrame(player.base, attacker);
  const slotLine = slotLineOf(player.family, frameBase.x);
  return {
    player,
    frameBase,
    attacking: player.team === attacker,
    slotLine,
    line: effectiveLine(slotLine, player.roleId, third),
    baseSide: signOf(frameBase.x - CENTRE_X),
    profile: profileOf(player.roleId),
  };
}

function depthOf(entry: Entry, third: Third): number {
  const table = entry.attacking ? ATTACK_DEPTH : DEFEND_DEPTH;
  const rule = entry.profile?.y;
  if (!rule) return table[entry.line as OutfieldLine][third];
  if ('D' in rule) return rule[third];
  const source = rule.line === 'own' ? entry.slotLine : rule.line;
  const depth = table[source as OutfieldLine][third] + rule.dy;
  const range = rule.range?.[third];
  return range ? Math.min(Math.max(depth, range[0]), range[1]) : depth;
}

function lateralRuleOf(entry: Entry, third: Third): LateralRule {
  const rule = entry.profile?.x ?? 'slot';
  return typeof rule === 'object' && 'D' in rule ? rule[third] : rule;
}

function slotXOf(
  entry: Entry,
  entries: readonly Entry[],
  third: Third,
  insideBacks: { left: boolean; right: boolean },
): number {
  const { player, attacking, line } = entry;
  if (!isCentral(line)) {
    const edge = wideX(line as OutfieldLine, attacking, third);
    return entry.frameBase.x < CENTRE_X ? edge : PITCH_W - edge;
  }
  const group = entries
    .filter((other) => other.player.team === player.team && other.line === line)
    .sort(byLeftToRight);
  const index = group.indexOf(entry);
  const columns = (attacking ? ATTACK_COLUMNS : DEFEND_COLUMNS)[line];
  if (line === 'CB') {
    const sides = attacking ? insideBacks : { left: false, right: false };
    return backLineX(columns, group.length, index, sides);
  }
  return centralX(columns, group.length, index, entry.frameBase.x);
}

function ruleX(entry: Entry, rule: LateralRule, slotX: number, context: Context): number {
  const { ballSign } = context;
  if (rule === 'slot') return slotX;
  if (rule === 'split') {
    const group = context.splitGroups.get(entry.player.team) ?? [];
    if (group.length >= 2) {
      const index = group.indexOf(entry.player.id);
      return edgeX(index * 2 < group.length - 1 ? -1 : 1, HALF_SPACE);
    }
    return ballSign === 0 ? slotX : edgeX(ballSign, HALF_SPACE);
  }
  if ('follow' in rule) return ballSign === 0 ? slotX : edgeX(ballSign, rule.follow);
  if ('edge' in rule) {
    if (entry.baseSide !== 0) return edgeX(entry.baseSide, rule.edge);
    if (rule.centre === 'follow' && ballSign !== 0) return edgeX(ballSign, rule.edge);
    return slotX;
  }
  const side = entry.baseSide || ballSign;
  if (side === 0) return slotX;
  if (side === ballSign) return edgeX(side, rule.ballEdge);
  return rule.farEdge === 'slot' ? slotX : edgeX(side, rule.farEdge);
}

function byLeftToRight(a: Entry, b: Entry): number {
  if (Math.abs(a.frameBase.x - b.frameBase.x) > 1e-6) return a.frameBase.x - b.frameBase.x;
  const halfBackDelta =
    Number(a.player.roleId === HALF_BACK) - Number(b.player.roleId === HALF_BACK);
  const inwardLast = a.frameBase.x < CENTRE_X ? halfBackDelta : -halfBackDelta;
  return inwardLast || a.player.id.localeCompare(b.player.id);
}

export function formationAnchors(input: AnchorInput): Map<string, Anchor> {
  const { attacker, players, zone } = input;
  const third = thirdOf(zone);
  const entries = players.map((player) => entryOf(attacker, third, player));
  const insideBacks = {
    left: entries.some(
      (e) => e.attacking && e.player.roleId === INSIDE_FULL_BACK && e.baseSide < 0,
    ),
    right: entries.some(
      (e) => e.attacking && e.player.roleId === INSIDE_FULL_BACK && e.baseSide > 0,
    ),
  };
  const context: Context = {
    ballSign: laneSignOf(zone),
    splitGroups: new Map<Side, readonly string[]>(
      (['mine', 'opponent'] as const).map((team) => [
        team,
        entries
          .filter((e) => e.player.team === team && e.profile?.x === 'split')
          .sort(byLeftToRight)
          .map((e) => e.player.id),
      ]),
    ),
  };

  const provisional = new Map<string, Point>();
  for (const entry of entries) {
    const { player, attacking, line } = entry;
    if (line === 'GK') {
      provisional.set(player.id, { x: CENTRE_X, y: keeperDepth(attacking, entry.profile) });
      continue;
    }
    const slotX = slotXOf(entry, entries, third, insideBacks);
    provisional.set(player.id, {
      x: ruleX(entry, lateralRuleOf(entry, third), slotX, context),
      y: depthOf(entry, third),
    });
  }

  const interactionEntries: InteractionEntry[] = entries.map((entry) => ({
    id: entry.player.id,
    roleId: entry.player.roleId,
    side: entry.baseSide || context.ballSign,
    attacking: entry.attacking,
    line: entry.line,
  }));
  const settled = applyInteractions(interactionEntries, provisional, third);

  return new Map(
    entries.map((entry): [string, Anchor] => {
      const shift = laneShiftOf(zone, entry.attacking);
      const point = settled.get(entry.player.id)!;
      const x = entry.line === 'GK' ? CENTRE_X + shift * KEEPER_SHIFT_SHARE : point.x + shift;
      return [entry.player.id, { line: entry.line, point: { x, y: point.y } }];
    }),
  );
}
