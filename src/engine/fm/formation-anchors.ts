import type { Family, Point, Side } from '../../data/types';
import type { Third, ZoneId } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import type { FmPlayer } from './player';
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
type Depths = Record<Third, number>;

interface Columns {
  pair: readonly [number, number];
  triple: readonly [number, number, number];
}

const CENTRE_X = PITCH_W / 2;
const WIDE_ATTACKER_MAX_EDGE_DISTANCE = 17;
const KEEPER_SHIFT_SHARE = 0.2;
const BALL_PLAYING_KEEPER_ROLE = 'ball_playing_goalkeeper_ip';
const ATTACKING_KEEPER_DEPTH = 96;
const BALL_PLAYING_KEEPER_DEPTH = 92;
const DEFENDING_KEEPER_DEPTH = 4;

const depths = (d: number, m: number, f: number): Depths => ({ D: d, M: m, F: f });

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

function keeperDepth(attacking: boolean, roleId: string | undefined): number {
  if (!attacking) return DEFENDING_KEEPER_DEPTH;
  return roleId === BALL_PLAYING_KEEPER_ROLE ? BALL_PLAYING_KEEPER_DEPTH : ATTACKING_KEEPER_DEPTH;
}

export function formationAnchors(input: AnchorInput): Map<string, Anchor> {
  const { attacker, players, zone } = input;
  const third = thirdOf(zone);
  const entries = players.map((player) => {
    const frameBase = toDisplayFrame(player.base, attacker);
    return {
      player,
      frameBase,
      attacking: player.team === attacker,
      line: slotLineOf(player.family, frameBase.x),
    };
  });

  return new Map(
    entries.map(({ player, frameBase, attacking, line }): [string, Anchor] => {
      const shift = laneShiftOf(zone, attacking);
      if (line === 'GK') {
        const point = {
          x: CENTRE_X + shift * KEEPER_SHIFT_SHARE,
          y: keeperDepth(attacking, player.roleId),
        };
        return [player.id, { line, point }];
      }
      const y = (attacking ? ATTACK_DEPTH : DEFEND_DEPTH)[line][third];
      if (!isCentral(line)) {
        const side = frameBase.x < CENTRE_X ? 1 : -1;
        const edgeX =
          side === 1 ? wideX(line, attacking, third) : PITCH_W - wideX(line, attacking, third);
        return [player.id, { line, point: { x: edgeX + shift, y } }];
      }
      const group = entries
        .filter((entry) => entry.player.team === player.team && entry.line === line)
        .sort((a, b) => a.frameBase.x - b.frameBase.x);
      const index = group.findIndex((entry) => entry.player.id === player.id);
      const columns = (attacking ? ATTACK_COLUMNS : DEFEND_COLUMNS)[line];
      const x = centralX(columns, group.length, index, frameBase.x);
      return [player.id, { line, point: { x: x + shift, y } }];
    }),
  );
}
