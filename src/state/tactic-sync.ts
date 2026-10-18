import { SIDES, mapPlayer, type PitchDocument, type Player } from './document';
import { setSquadSize } from './layout-actions';
import { otherMode, type Mode, type Tactic } from './tactic';

function withCustomName(player: Player, name: string | undefined): Player {
  if (player.customName === name) return player;
  const { customName: _previous, ...rest } = player;
  return name === undefined ? rest : { ...rest, customName: name };
}

function adoptTeams(
  before: PitchDocument,
  after: PitchDocument,
  target: PitchDocument,
): PitchDocument | null {
  return SIDES.reduce<PitchDocument | null>((current, team) => {
    if (!current) return null;
    const named =
      before.teams[team].name === after.teams[team].name
        ? current
        : {
            ...current,
            teams: {
              ...current.teams,
              [team]: { ...current.teams[team], name: after.teams[team].name },
            },
          };
    const size = after.teams[team].squadSize;
    if (before.teams[team].squadSize === size || named.teams[team].squadSize === size) return named;
    const resized = setSquadSize(named, team, size);
    return resized === named ? null : resized;
  }, target);
}

function syncCustomNames(
  before: PitchDocument,
  after: PitchDocument,
  target: PitchDocument,
): { source: PitchDocument; target: PitchDocument } {
  const known = new Map(before.players.map((player) => [player.id, player.customName]));
  const peers = new Map(target.players.map((player) => [player.id, player.customName]));
  const source = after.players.map((player) =>
    !known.has(player.id) && peers.has(player.id)
      ? withCustomName(player, peers.get(player.id))
      : player,
  );
  const synced = source.reduce(
    (doc, player) =>
      known.has(player.id) && peers.has(player.id) && known.get(player.id) !== player.customName
        ? mapPlayer(doc, player.id, (peer) => withCustomName(peer, player.customName))
        : doc,
    target,
  );
  const changed = source.some((player, index) => player !== after.players[index]);
  return { source: changed ? { ...after, players: source } : after, target: synced };
}

export function syncRoster(before: Tactic, source: Mode, after: PitchDocument): Tactic | null {
  const targetMode = otherMode(source);
  const teams = adoptTeams(before[source], after, before[targetMode]);
  if (!teams) return null;
  const names = syncCustomNames(before[source], after, teams);
  return { ...before, [source]: names.source, [targetMode]: names.target } as Tactic;
}
