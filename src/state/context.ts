import type { DataSet, Side } from '../data/types';
import type { PhasePlayer, ScenarioContext } from '../engine';
import { isRoleValidFor, placedPlayers, type PitchDocument, type Player } from './document';

export function activeRoleOf(
  doc: PitchDocument,
  player: Player,
  data: DataSet,
): string | undefined {
  return player.role && isRoleValidFor(doc, data, player, player.role) ? player.role : undefined;
}

export function phasePlayersOf(doc: PitchDocument, data: DataSet): PhasePlayer[] {
  return placedPlayers(doc).map((player) => ({
    id: player.id,
    team: player.team,
    base: player.base!,
    roleId: activeRoleOf(doc, player, data),
    isKeeper: player.isKeeper,
  }));
}

export function scenarioContextOf(doc: PitchDocument, data: DataSet): ScenarioContext {
  return {
    attacker: doc.attacker,
    players: phasePlayersOf(doc, data),
    ball: doc.ball,
    carrierId: doc.scenario?.carrierId ?? null,
  };
}

export function attackersOf(doc: PitchDocument, side: Side = doc.attacker): Player[] {
  return placedPlayers(doc).filter((player) => player.team === side);
}
