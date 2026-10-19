import type { Side } from '../data/types';
import {
  SIDES,
  keeperOf,
  playersOf,
  replaceTeamPlayers,
  type PitchDocument,
  type Player,
} from './document';
import { benchedPlayer } from './layout-actions';
import { otherMode, type Mode, type Tactic } from './tactic';

function withCustomName(player: Player, name: string | undefined): Player {
  if (player.customName === name) return player;
  const { customName: _previous, ...rest } = player;
  return name === undefined ? rest : { ...rest, customName: name };
}

function withPlacementOf(player: Player, from: Player): Player {
  const { base: _base, role: _role, ...rest } = player;
  return {
    ...rest,
    family: from.family,
    slot: from.slot,
    isKeeper: from.isKeeper,
    ...(from.base ? { base: from.base } : {}),
    ...(from.role ? { role: from.role } : {}),
  };
}

function swapPlacements(doc: PitchDocument, a: Player, b: Player): PitchDocument {
  const players = doc.players.map((player) =>
    player.id === a.id
      ? withPlacementOf(player, b)
      : player.id === b.id
        ? withPlacementOf(player, a)
        : player,
  );
  const carrierId = doc.scenario?.carrierId;
  const swappedCarrier = carrierId === a.id ? b.id : carrierId === b.id ? a.id : null;
  const scenario =
    doc.scenario && swappedCarrier ? { ...doc.scenario, carrierId: swappedCarrier } : doc.scenario;
  return { ...doc, players, scenario };
}

function adoptKeepers(source: PitchDocument, target: PitchDocument): PitchDocument {
  return SIDES.reduce((doc, team) => {
    const own = keeperOf(doc, team);
    const shared = keeperOf(target, team);
    if (!own || !shared || own.id === shared.id) return doc;
    const peer = doc.players.find((player) => player.id === shared.id);
    return peer ? swapPlacements(doc, own, peer) : doc;
  }, source);
}

function adoptTeam(source: PitchDocument, target: PitchDocument, team: Side): PitchDocument | null {
  const roster = playersOf(source, team);
  const ids = new Set(roster.map((player) => player.id));
  const current = playersOf(target, team);
  const known = new Set(current.map((player) => player.id));
  const dropped = current.filter((player) => !ids.has(player.id));
  if (
    dropped.some((player) => player.base !== undefined || player.slot !== null || player.isKeeper)
  ) {
    return null;
  }
  const added = roster.filter((player) => !known.has(player.id)).map(benchedPlayer);
  const { name, squadSize } = source.teams[team];
  const meta = target.teams[team];
  if (!dropped.length && !added.length && meta.name === name && meta.squadSize === squadSize) {
    return target;
  }
  const kept = current.filter((player) => ids.has(player.id));
  return {
    ...target,
    teams: { ...target.teams, [team]: { ...meta, name, squadSize } },
    players: replaceTeamPlayers(target, team, [...kept, ...added]),
  };
}

function adoptNames(source: PitchDocument, target: PitchDocument): PitchDocument {
  const names = new Map(source.players.map((player) => [player.id, player.customName]));
  const players = target.players.map((player) =>
    names.has(player.id) ? withCustomName(player, names.get(player.id)) : player,
  );
  const changed = players.some((player, index) => player !== target.players[index]);
  return changed ? { ...target, players } : target;
}

export function syncRoster(before: Tactic, source: Mode, after: PitchDocument): Tactic | null {
  const targetMode = otherMode(source);
  const synced = adoptKeepers(after, before[targetMode]);
  const teams = SIDES.reduce<PitchDocument | null>(
    (doc, team) => (doc ? adoptTeam(synced, doc, team) : null),
    before[targetMode],
  );
  if (!teams) return null;
  return { ...before, [source]: synced, [targetMode]: adoptNames(synced, teams) } as Tactic;
}
