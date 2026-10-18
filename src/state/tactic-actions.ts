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
import { spareRoster } from './layout-actions';
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

function starterOf(player: Player): Player {
  return {
    id: player.id,
    team: player.team,
    family: player.family,
    slot: player.slot,
    isKeeper: player.isKeeper,
    base: player.base,
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
  const starters = playersOf(fm, team)
    .filter((player) => player.slot !== null && player.base !== undefined)
    .map(starterOf);
  if (!formationOf(data, formationId) || starters.length === 0) {
    return benchedEverywhere(openPitch, team);
  }
  const meta = openPitch.teams[team];
  const spares = spareRoster(
    team,
    playersOf(openPitch, team),
    starters,
    Math.max(0, meta.squadSize - starters.length),
  );
  return {
    ...openPitch,
    teams: {
      ...openPitch.teams,
      [team]: { ...meta, formationId, keeper: starters.some((p) => p.isKeeper), applied: null },
    },
    players: replaceTeamPlayers(openPitch, team, [...starters, ...spares]),
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
