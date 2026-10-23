import type { FormationSlot } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { eligibleCarrierIds, type CarrierPlayer } from './carrier-eligibility';

const UNSLOTTED = Number.POSITIVE_INFINITY;

export function visualizationStarters(
  zone: ZoneId,
  players: readonly CarrierPlayer[],
  slots: readonly FormationSlot[],
): string[] {
  const rank = new Map(slots.map((slot, index) => [slot.id, index]));
  const slotRank = (player: CarrierPlayer) =>
    player.slot === null ? UNSLOTTED : (rank.get(player.slot) ?? UNSLOTTED);
  const eligible = new Set(eligibleCarrierIds(zone, players, slots));
  return players
    .filter((player) => eligible.has(player.id))
    .sort((a, b) => slotRank(a) - slotRank(b))
    .map((player) => player.id);
}
