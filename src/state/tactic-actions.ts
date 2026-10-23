import { FM26_DATA } from '../data/fm26';
import type { DataSet, Point, Side } from '../data/types';
import { applyAction, type Action } from './actions';
import {
  SIDES,
  formationOf,
  playersOf,
  replaceTeamPlayers,
  roundPoint,
  type PitchDocument,
  type Player,
  type SquadSize,
} from './document';
import { benchedPlayer, isRemovable, resetFm, setSquadSize } from './layout-actions';
import { wrapSequenceIndex } from './visualization';
import { syncRoster } from './tactic-sync';
import { otherMode, type Mode, type Tactic } from './tactic';

const FM_ONLY_ACTIONS: ReadonlySet<Action['type']> = new Set([
  'tapZone',
  'setRole',
  'fillDefaultRoles',
]);

function applyToLayout(
  doc: PitchDocument,
  mode: Mode,
  action: Action,
  data: DataSet,
): PitchDocument {
  if (mode === 'openPitch' && FM_ONLY_ACTIONS.has(action.type)) return doc;
  if (mode === 'fm' && action.type === 'clearPitch') return doc;
  if (mode === 'fm' && action.type === 'reset') return resetFm(doc);
  const next = applyAction(doc, action, data);
  return mode === 'fm' ? wrapSequenceIndex(next) : next;
}

function applyToTacticLayout(
  tactic: Tactic,
  mode: Mode,
  action: Action,
  data: DataSet,
): PitchDocument {
  if (action.type !== 'setSquadSize') return applyToLayout(tactic[mode], mode, action, data);
  const placedElsewhere = playersOf(tactic[otherMode(mode)], action.team)
    .filter((player) => !isRemovable(player))
    .map((player) => player.id);
  return setSquadSize(tactic[mode], action.team, action.size, new Set(placedElsewhere));
}

export function applyTacticAction(
  tactic: Tactic,
  mode: Mode,
  action: Action,
  data: DataSet = FM26_DATA,
): Tactic {
  const current = tactic[mode];
  const next = applyToTacticLayout(tactic, mode, action, data);
  if (next === current) return tactic;
  return syncRoster(tactic, mode, next) ?? tactic;
}

export function canSetSquadSize(tactic: Tactic, mode: Mode, team: Side, size: SquadSize): boolean {
  return (
    tactic[mode].teams[team].squadSize === size ||
    applyTacticAction(tactic, mode, { type: 'setSquadSize', team, size }) !== tactic
  );
}

function withoutRole(player: Player): Player {
  const { role: _role, ...rest } = player;
  return rest;
}

function benchedEverywhere(doc: PitchDocument, team: Side): PitchDocument {
  const players = playersOf(doc, team).map((player) => {
    const { base: _base, ...rest } = withoutRole(player);
    return rest;
  });
  return { ...doc, players: replaceTeamPlayers(doc, team, players) };
}

function starterOf(player: Player, starter: Player, at: Point): Player {
  return {
    id: player.id,
    team: player.team,
    family: starter.family,
    slot: starter.slot,
    isKeeper: starter.isKeeper,
    base: roundPoint(at),
    ...(player.customName ? { customName: player.customName } : {}),
  };
}

function copyTeam(
  openPitch: PitchDocument,
  fm: PitchDocument,
  team: Side,
  positions: ReadonlyMap<string, Point>,
  data: DataSet,
): PitchDocument {
  const formationId = fm.teams[team].formationId;
  const starters = new Map(
    playersOf(fm, team).flatMap((player) => {
      const at = positions.get(player.id);
      return player.slot !== null && at ? [[player.id, { player, at }] as const] : [];
    }),
  );
  if (!formationOf(data, formationId) || starters.size === 0) {
    return benchedEverywhere(openPitch, team);
  }
  const players = playersOf(openPitch, team).map((player) => {
    const starter = starters.get(player.id);
    return starter ? starterOf(player, starter.player, starter.at) : benchedPlayer(player);
  });
  const meta = openPitch.teams[team];
  return {
    ...openPitch,
    teams: {
      ...openPitch.teams,
      [team]: {
        ...meta,
        formationId,
        keeper: players.some((player) => player.isKeeper),
        applied: null,
      },
    },
    players: replaceTeamPlayers(openPitch, team, players),
  };
}

function sameLayout(a: PitchDocument, b: PitchDocument): boolean {
  return JSON.stringify([a.teams, a.players]) === JSON.stringify([b.teams, b.players]);
}

export function copyFmPositions(
  tactic: Tactic,
  positions: ReadonlyMap<string, Point>,
  data: DataSet = FM26_DATA,
): Tactic {
  const { fm, openPitch } = tactic;
  if (!fm.players.some((player) => positions.has(player.id))) return tactic;
  const copied = SIDES.reduce((doc, team) => copyTeam(doc, fm, team, positions, data), openPitch);
  if (sameLayout(copied, openPitch)) return tactic;
  return syncRoster(tactic, 'openPitch', copied) ?? tactic;
}
