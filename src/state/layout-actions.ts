import type { DataSet, FormationDef, Side } from '../data/types';
import { layoutFormation, layoutMatchup, type TeamLayout } from '../engine';
import {
  BALL_START,
  SIDES,
  benchPieceId,
  formationOf,
  playersOf,
  replaceTeamPlayers,
  roundPoint,
  type AppliedLayout,
  type BoardDocument,
  type Player,
  type SquadSize,
} from './document';
import { reconcileRoles } from './role-actions';
import { refreshScenario } from './scenario-actions';

function isSpare(player: Player): boolean {
  return player.slot === null && !player.isKeeper;
}

function nextFreeId(team: Side, taken: ReadonlySet<string>): string {
  let index = 1;
  while (taken.has(benchPieceId(team, index))) index += 1;
  return benchPieceId(team, index);
}

function benched(player: Player): Player {
  const { base: _base, role: _role, ...rest } = player;
  return { ...rest, family: null };
}

function spareRoster(team: Side, previous: Player[], reserved: Player[], count: number): Player[] {
  const reused = previous.filter(isSpare).slice(0, count).map(benched);
  const taken = new Set([...reserved, ...reused].map((player) => player.id));
  const created = Array.from({ length: count - reused.length }, (): Player => {
    const id = nextFreeId(team, taken);
    taken.add(id);
    return { id, team, family: null, slot: null, isKeeper: false };
  });
  return [...reused, ...created];
}

function slotPlayers(
  team: Side,
  formation: FormationDef,
  layout: TeamLayout,
  previous: Player[],
): Player[] {
  const bySlot = new Map(previous.flatMap((p) => (p.slot ? [[p.slot, p] as const] : [])));
  return formation.slots.map((slot) => {
    const prior = bySlot.get(slot.id);
    return {
      id: `${team}-${slot.id}`,
      team,
      family: slot.family,
      slot: slot.id,
      isKeeper: slot.family === 'GK',
      base: roundPoint(layout.get(slot.id)!),
      ...(prior?.customName ? { customName: prior.customName } : {}),
      ...(prior?.role ? { role: prior.role } : {}),
    };
  });
}

function placeTeam(
  doc: BoardDocument,
  team: Side,
  formation: FormationDef,
  layout: TeamLayout,
  applied: AppliedLayout,
): BoardDocument {
  const previous = playersOf(doc, team);
  const placed = slotPlayers(team, formation, layout, previous);
  const spares = spareRoster(
    team,
    previous,
    placed,
    Math.max(0, doc.teams[team].squadSize - placed.length),
  );
  return {
    ...doc,
    teams: {
      ...doc.teams,
      [team]: { ...doc.teams[team], formationId: formation.id, keeper: true, applied },
    },
    players: replaceTeamPlayers(doc, team, [...placed, ...spares]),
  };
}

function settle(doc: BoardDocument, data: DataSet): BoardDocument {
  return refreshScenario(reconcileRoles(doc, data));
}

export function applyFormation(
  doc: BoardDocument,
  team: Side,
  formationId: string,
  data: DataSet,
): BoardDocument {
  const formation = formationOf(data, formationId);
  if (!formation) return doc;
  return settle(
    placeTeam(doc, team, formation, layoutFormation(formation, team), 'formation'),
    data,
  );
}

export function applyMatchup(doc: BoardDocument, data: DataSet): BoardDocument {
  const mine = formationOf(data, doc.teams.mine.formationId);
  const opponent = formationOf(data, doc.teams.opponent.formationId);
  if (!mine || !opponent) return doc;
  const formations = { mine, opponent };
  const layouts = layoutMatchup(doc.attacker, formations);
  const placed = SIDES.reduce(
    (current, team) => placeTeam(current, team, formations[team], layouts[team], 'matchup'),
    doc,
  );
  return settle(placed, data);
}

function blankTeam(doc: BoardDocument, team: Side): BoardDocument {
  const meta = doc.teams[team];
  const pieces = spareRoster(team, [], [], meta.squadSize);
  return {
    ...doc,
    teams: { ...doc.teams, [team]: { ...meta, formationId: null, keeper: false, applied: null } },
    players: replaceTeamPlayers(doc, team, pieces),
  };
}

export function resetBoard(doc: BoardDocument, data: DataSet): BoardDocument {
  const cleared: BoardDocument = { ...doc, ball: BALL_START, scenario: null };
  const bothMatchup = SIDES.every((team) => doc.teams[team].applied === 'matchup');
  if (bothMatchup) return applyMatchup(cleared, data);
  return SIDES.reduce((current, team) => {
    const { applied, formationId } = doc.teams[team];
    if (applied === null || formationId === null) return blankTeam(current, team);
    return applyFormation(current, team, formationId, data);
  }, cleared);
}

export function setSquadSize(doc: BoardDocument, team: Side, size: SquadSize): BoardDocument {
  const players = playersOf(doc, team);
  const surplus = players.length - size;
  if (surplus > 0) return shrinkSquad(doc, team, players, surplus, size);
  const taken = new Set(players.map((player) => player.id));
  const added = Array.from({ length: -surplus }, (): Player => {
    const id = nextFreeId(team, taken);
    taken.add(id);
    return { id, team, family: null, slot: null, isKeeper: false };
  });
  return withSquadSize(doc, team, [...players, ...added], size);
}

function shrinkSquad(
  doc: BoardDocument,
  team: Side,
  players: Player[],
  surplus: number,
  size: SquadSize,
): BoardDocument {
  const removable = players.filter((player) => isSpare(player) && player.base === undefined);
  if (removable.length < surplus) return doc;
  const dropped = new Set(removable.slice(-surplus));
  return withSquadSize(
    doc,
    team,
    players.filter((player) => !dropped.has(player)),
    size,
  );
}

function withSquadSize(
  doc: BoardDocument,
  team: Side,
  players: Player[],
  squadSize: SquadSize,
): BoardDocument {
  return {
    ...doc,
    teams: { ...doc.teams, [team]: { ...doc.teams[team], squadSize } },
    players: replaceTeamPlayers(doc, team, players),
  };
}

export function setKeeper(
  doc: BoardDocument,
  team: Side,
  keeper: boolean,
  data: DataSet,
): BoardDocument {
  const players = playersOf(doc, team);
  const next = keeper ? promoteKeeper(players) : demoteKeepers(players);
  const hasKeeper = next.some((player) => player.isKeeper);
  if (next === players && doc.teams[team].keeper === hasKeeper) return doc;
  const withMeta: BoardDocument = {
    ...doc,
    teams: { ...doc.teams, [team]: { ...doc.teams[team], keeper: hasKeeper } },
    players: replaceTeamPlayers(doc, team, next),
  };
  return reconcileRoles(withMeta, data);
}

function promoteKeeper(players: Player[]): Player[] {
  if (players.some((player) => player.isKeeper)) return players;
  const spares = players.filter(isSpare);
  const choice = spares.find((player) => player.base === undefined) ?? spares[spares.length - 1];
  if (!choice) return players;
  return players.map((player) =>
    player === choice ? { ...player, family: 'GK', isKeeper: true } : player,
  );
}

function demoteKeepers(players: Player[]): Player[] {
  if (!players.some((player) => player.isKeeper && player.slot === null)) return players;
  return players.map((player) =>
    player.isKeeper && player.slot === null ? { ...player, family: null, isKeeper: false } : player,
  );
}
