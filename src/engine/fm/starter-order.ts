import type { FormationSlot } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import type { CarrierPlayer, LateralSide } from './carrier-eligibility';
import { laneOf, thirdOf } from './zones';

const UNSLOTTED = Number.POSITIVE_INFINITY;
const MIDFIELD_STARTER_ROLES: readonly string[] = [
  'central_midfielder_ip',
  'channel_midfielder_ip',
];
const NEAR = 0;
const CENTRAL = 1;
const FAR = 2;

function nearSideOf(zone: ZoneId): LateralSide | null {
  const lane = laneOf(zone);
  if (thirdOf(zone) === 'D' || (lane !== 'LH' && lane !== 'RH')) return null;
  return lane === 'LH' ? 'left' : 'right';
}

function sideRankOf(player: CarrierPlayer, nearSide: LateralSide): number {
  if (player.side === undefined) return CENTRAL;
  return player.side === nearSide ? NEAR : FAR;
}

export function orderStarters(
  zone: ZoneId,
  players: readonly CarrierPlayer[],
  slots: readonly FormationSlot[],
): CarrierPlayer[] {
  const slotIndex = new Map(slots.map((slot, index) => [slot.id, index]));
  const slotBaseX = new Map(slots.map((slot) => [slot.id, slot.base.x]));
  const slotRank = (player: CarrierPlayer) =>
    player.slot === null ? UNSLOTTED : (slotIndex.get(player.slot) ?? UNSLOTTED);
  const nearSide = nearSideOf(zone);
  if (nearSide === null) return [...players].sort((a, b) => slotRank(a) - slotRank(b));

  const direction = nearSide === 'left' ? 1 : -1;
  const lateralOrder = (player: CarrierPlayer) =>
    player.slot === null ? UNSLOTTED : direction * (slotBaseX.get(player.slot) ?? 0);
  const isMidfielder = (player: CarrierPlayer) =>
    player.roleId !== undefined && MIDFIELD_STARTER_ROLES.includes(player.roleId);
  return [...players].sort((a, b) => {
    const tier = Number(!isMidfielder(a)) - Number(!isMidfielder(b));
    if (tier !== 0) return tier;
    if (!isMidfielder(a)) return slotRank(a) - slotRank(b);
    return (
      sideRankOf(a, nearSide) - sideRankOf(b, nearSide) ||
      lateralOrder(a) - lateralOrder(b) ||
      a.id.localeCompare(b.id)
    );
  });
}
