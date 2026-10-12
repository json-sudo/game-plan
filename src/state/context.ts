import type { DataSet, Side } from '../data/types';
import type { PhasePlayer, ScenarioContext } from '../engine';
import {
  isRoleValidFor,
  placedPlayers,
  possessionOf,
  type BoardDocument,
  type Player,
} from './document';

export function activeRoleOf(
  doc: BoardDocument,
  player: Player,
  data: DataSet,
): string | undefined {
  const valid =
    player.role && isRoleValidFor(data, player.role, player.family, possessionOf(doc, player.team));
  return valid ? player.role : undefined;
}

export function phasePlayersOf(doc: BoardDocument, data: DataSet): PhasePlayer[] {
  return placedPlayers(doc).map((player) => ({
    id: player.id,
    team: player.team,
    base: player.base!,
    roleId: activeRoleOf(doc, player, data),
    isKeeper: player.isKeeper,
  }));
}

export function scenarioContextOf(doc: BoardDocument, data: DataSet): ScenarioContext {
  return {
    attacker: doc.attacker,
    players: phasePlayersOf(doc, data),
    ball: doc.ball,
    carrierId: doc.scenario?.carrierId ?? null,
  };
}

export function attackersOf(doc: BoardDocument, side: Side = doc.attacker): Player[] {
  return placedPlayers(doc).filter((player) => player.team === side);
}
