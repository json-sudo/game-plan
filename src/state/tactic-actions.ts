import { FM26_DATA } from '../data/fm26';
import type { DataSet, Point, Side } from '../data/types';
import { PITCH_TARGET_MARGIN, clampToPitch as clampPitchPoint } from '../engine';
import { applyAction, type Action } from './actions';
import {
  SIDES,
  formationOf,
  playersOf,
  replaceTeamPlayers,
  roundPoint,
  type PitchDocument,
  type Player,
} from './document';
import { benchedPlayer } from './layout-actions';
import { syncRoster } from './tactic-sync';
import type { Mode, Tactic } from './tactic';

const FM_ONLY_ACTIONS: ReadonlySet<Action['type']> = new Set([
  'tapZone',
  'setCarrier',
  'pass',
  'dribble',
  'setRole',
  'fillDefaultRoles',
  'clearScenario',
]);

function moveOpenPitchBall(doc: PitchDocument, point: Point): PitchDocument {
  const ball = roundPoint(clampPitchPoint(point, PITCH_TARGET_MARGIN));
  return ball.x === doc.ball.x && ball.y === doc.ball.y ? doc : { ...doc, ball };
}

function applyToLayout(
  doc: PitchDocument,
  mode: Mode,
  action: Action,
  data: DataSet,
): PitchDocument {
  if (mode !== 'openPitch') return applyAction(doc, action, data);
  if (FM_ONLY_ACTIONS.has(action.type)) return doc;
  return action.type === 'dragBall'
    ? moveOpenPitchBall(doc, action.point)
    : applyAction(doc, action, data);
}

export function applyTacticAction(
  tactic: Tactic,
  mode: Mode,
  action: Action,
  data: DataSet = FM26_DATA,
): Tactic {
  const current = tactic[mode];
  const next = applyToLayout(current, mode, action, data);
  if (next === current) return tactic;
  return syncRoster(tactic, mode, next) ?? tactic;
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

function starterOf(player: Player, starter: Player): Player {
  return {
    id: player.id,
    team: player.team,
    family: starter.family,
    slot: starter.slot,
    isKeeper: starter.isKeeper,
    base: starter.base,
    ...(player.customName ? { customName: player.customName } : {}),
  };
}

function copyTeam(
  openPitch: PitchDocument,
  fm: PitchDocument,
  team: Side,
  data: DataSet,
): PitchDocument {
  const formationId = fm.teams[team].formationId;
  const starters = new Map(
    playersOf(fm, team)
      .filter((player) => player.slot !== null && player.base !== undefined)
      .map((player) => [player.id, player]),
  );
  if (!formationOf(data, formationId) || starters.size === 0) {
    return benchedEverywhere(openPitch, team);
  }
  const players = playersOf(openPitch, team).map((player) => {
    const starter = starters.get(player.id);
    return starter ? starterOf(player, starter) : benchedPlayer(player);
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

export function copyFmPositions(tactic: Tactic, data: DataSet = FM26_DATA): Tactic {
  const { fm, openPitch } = tactic;
  if (!fm.players.some((player) => player.base !== undefined)) return tactic;
  const copied = SIDES.reduce((doc, team) => copyTeam(doc, fm, team, data), openPitch);
  if (sameLayout(copied, openPitch)) return tactic;
  return syncRoster(tactic, 'openPitch', copied) ?? tactic;
}
