import type { Point, Side } from '../../data/types';
import type { Lane, Third, ZoneId } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import type { LateralSide } from './carrier-eligibility';
import { engageCarrier, type Engagement } from './engager';
import type { Anchor, SlotLine } from './formation-anchors';
import type { FmPlayer } from './player';
import { FLANK } from './role-regions';
import { laneOf, laneSignOf, thirdOf } from './zones';

export interface OpeningResponseInput {
  attacker: Side;
  zone: ZoneId;
  players: readonly FmPlayer[];
  carrierId: string;
  carrier: Point;
  starterSide: LateralSide | undefined;
}

interface Response {
  line: SlotLine;
  target: Point;
}

type LeftLane = 'L' | 'LH' | 'C';

const CENTRE_X = PITCH_W / 2;
const FLANK_SUPPORT_GAP = 12;

const LEFT_LANE: Record<Lane, LeftLane> = { L: 'L', LH: 'LH', C: 'C', RH: 'LH', R: 'L' };

const at = (line: SlotLine, x: number, y: number): Response => ({ line, target: { x, y } });

// Reviewed reference responses for the defending block, in the left-hand frame.
const RESPONSES: Record<`${LeftLane}-${Third}`, readonly Response[]> = {
  'L-F': [at('ST', 39, 40)],
  'L-M': [at('WA', 15, 40), at('DM', 23, 33), at('ST', 43, 57)],
  'L-D': [at('WA', 14, 70)],
  'LH-F': [at('DM', 29, 21), at('AM', 39, 35), at('ST', 41, 40)],
  'LH-M': [at('ST', 43, 58)],
  'LH-D': [at('ST', 29, 75)],
  'C-F': [at('ST', 44, 40)],
  'C-M': [],
  'C-D': [at('ST', 43, 77)],
};

function isMirrored(zone: ZoneId, starterSide: LateralSide | undefined): boolean {
  const sign = laneSignOf(zone);
  return sign > 0 || (sign === 0 && starterSide === 'right');
}

function withinFlanks(x: number): number {
  return Math.min(Math.max(x, FLANK), PITCH_W - FLANK);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function defenderResponses(
  anchors: ReadonlyMap<string, Anchor>,
  input: OpeningResponseInput,
  mirrored: boolean,
): Map<string, Point> {
  const key = `${LEFT_LANE[laneOf(input.zone)]}-${thirdOf(input.zone)}` as const;
  const defenders = input.players.filter(
    (player) => player.team !== input.attacker && !player.isKeeper,
  );
  return RESPONSES[key].reduce((assigned, response) => {
    const target = mirrored
      ? { x: PITCH_W - response.target.x, y: response.target.y }
      : response.target;
    const chosen = defenders
      .filter(
        (player) => !assigned.has(player.id) && anchors.get(player.id)!.line === response.line,
      )
      .map((player) => ({ id: player.id, gap: distance(anchors.get(player.id)!.point, target) }))
      .sort((a, b) => a.gap - b.gap || a.id.localeCompare(b.id))[0];
    return chosen ? new Map([...assigned, [chosen.id, target]]) : assigned;
  }, new Map<string, Point>());
}

function flankSupport(
  anchors: ReadonlyMap<string, Anchor>,
  input: OpeningResponseInput,
): Map<string, Point> {
  const sign = laneSignOf(input.zone);
  const isMiddleFlank = thirdOf(input.zone) === 'M' && ['L', 'R'].includes(laneOf(input.zone));
  if (!isMiddleFlank) return new Map();
  return new Map(
    input.players.flatMap((player): [string, Point][] => {
      const anchor = anchors.get(player.id)!;
      const sameSide = sign < 0 ? anchor.point.x < CENTRE_X : anchor.point.x > CENTRE_X;
      const crowdsCarrier = Math.abs(anchor.point.y - input.carrier.y) < FLANK_SUPPORT_GAP;
      const supports =
        player.team === input.attacker &&
        player.id !== input.carrierId &&
        anchor.line === 'FB' &&
        sameSide &&
        crowdsCarrier;
      return supports
        ? [[player.id, { x: anchor.point.x, y: input.carrier.y + FLANK_SUPPORT_GAP }]]
        : [];
    }),
  );
}

export function applyOpeningResponse(
  anchors: ReadonlyMap<string, Anchor>,
  input: OpeningResponseInput,
): Engagement {
  const updates = new Map([
    ...flankSupport(anchors, input),
    ...defenderResponses(anchors, input, isMirrored(input.zone, input.starterSide)),
  ]);
  const responded = new Map(
    [...anchors].map(([id, anchor]): [string, Anchor] => {
      const point = updates.get(id) ?? anchor.point;
      return [
        id,
        anchor.line === 'GK'
          ? anchor
          : { ...anchor, point: { ...point, x: withinFlanks(point.x) } },
      ];
    }),
  );
  return engageCarrier(responded, {
    attacker: input.attacker,
    zone: input.zone,
    players: input.players,
    carrier: input.carrier,
  });
}
