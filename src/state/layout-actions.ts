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
  type PitchDocument,
  type Player,
  type SquadSize,
} from './document';
import { GOALKEEPER_LABEL, pieceLabel } from './bench-pieces';
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

export function benchedPlayer(player: Player): Player {
  return {
    id: player.id,
    team: player.team,
    family: null,
    slot: null,
    isKeeper: false,
    ...(player.customName ? { customName: player.customName } : {}),
  };
}

function slotHolders(formation: FormationDef, previous: Player[]): Array<Player | undefined> {
  const free = new Set(previous);
  const take = (match: (player: Player) => boolean) => {
    const found = [...free].find(match);
    if (found) free.delete(found);
    return found;
  };
  const bySlot = formation.slots.map((slot) => take((player) => player.slot === slot.id));
  const withKeeper = bySlot.map(
    (holder, index) =>
      holder ??
      (formation.slots[index].family === 'GK' ? take((player) => player.isKeeper) : undefined),
  );
  return withKeeper.map(
    (holder) => holder ?? take((player) => !player.isKeeper) ?? take(() => true),
  );
}

function slotPlayers(
  team: Side,
  formation: FormationDef,
  layout: TeamLayout,
  previous: Player[],
): Player[] {
  const holders = slotHolders(formation, previous);
  const taken = new Set(previous.map((player) => player.id));
  return formation.slots.map((slot, index) => {
    const holder = holders[index];
    const id = holder?.id ?? nextFreeId(team, taken);
    taken.add(id);
    return {
      id,
      team,
      family: slot.family,
      slot: slot.id,
      isKeeper: slot.family === 'GK',
      base: roundPoint(layout.get(slot.id)!),
      ...(holder?.customName ? { customName: holder.customName } : {}),
      ...(holder?.slot === slot.id && holder.role ? { role: holder.role } : {}),
    };
  });
}

function placeTeam(
  doc: PitchDocument,
  team: Side,
  formation: FormationDef,
  layout: TeamLayout,
  applied: AppliedLayout,
): PitchDocument {
  const previous = playersOf(doc, team);
  const placed = slotPlayers(team, formation, layout, previous);
  const placedIds = new Set(placed.map((player) => player.id));
  const spares = previous.filter((player) => !placedIds.has(player.id)).map(benchedPlayer);
  return {
    ...doc,
    teams: {
      ...doc.teams,
      [team]: { ...doc.teams[team], formationId: formation.id, keeper: true, applied },
    },
    players: replaceTeamPlayers(doc, team, [...placed, ...spares]),
  };
}

function settle(doc: PitchDocument, data: DataSet): PitchDocument {
  return refreshScenario(reconcileRoles(doc, data));
}

export function applyFormation(
  doc: PitchDocument,
  team: Side,
  formationId: string,
  data: DataSet,
): PitchDocument {
  const formation = formationOf(data, formationId);
  if (!formation) return doc;
  return settle(
    placeTeam(doc, team, formation, layoutFormation(formation, team), 'formation'),
    data,
  );
}

export function applyMatchup(doc: PitchDocument, data: DataSet): PitchDocument {
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

export interface MatchupChoice {
  mine: string;
  opponent: string;
}

export function applyMatchupChoice(
  doc: PitchDocument,
  choice: MatchupChoice,
  data: DataSet,
): PitchDocument {
  const chosen: PitchDocument = {
    ...doc,
    teams: {
      ...doc.teams,
      mine: { ...doc.teams.mine, formationId: choice.mine },
      opponent: { ...doc.teams.opponent, formationId: choice.opponent },
    },
  };
  const placed = applyMatchup(chosen, data);
  if (placed === chosen) return doc;
  return { ...placed, ball: BALL_START, scenario: null };
}

export function blankTeam(doc: PitchDocument, team: Side): PitchDocument {
  const meta = doc.teams[team];
  const pieces = playersOf(doc, team).map(benchedPlayer);
  return {
    ...doc,
    teams: { ...doc.teams, [team]: { ...meta, formationId: null, keeper: false, applied: null } },
    players: replaceTeamPlayers(doc, team, pieces),
  };
}

export function resetFm(doc: PitchDocument): PitchDocument {
  if (!doc.scenario) return doc;
  return { ...SIDES.reduce(blankTeam, doc), attacker: 'mine', ball: BALL_START, scenario: null };
}

export function resetPitch(doc: PitchDocument, data: DataSet): PitchDocument {
  const cleared: PitchDocument = { ...doc, ball: BALL_START, scenario: null };
  const bothMatchup = SIDES.every((team) => doc.teams[team].applied === 'matchup');
  if (bothMatchup) return applyMatchup(cleared, data);
  return SIDES.reduce((current, team) => {
    const { applied, formationId } = doc.teams[team];
    if (applied === null || formationId === null) return blankTeam(current, team);
    return applyFormation(current, team, formationId, data);
  }, cleared);
}

export function isRemovable(player: Player): boolean {
  return isSpare(player) && player.base === undefined;
}

export function setSquadSize(
  doc: PitchDocument,
  team: Side,
  size: SquadSize,
  kept: ReadonlySet<string> = new Set(),
): PitchDocument {
  const players = playersOf(doc, team);
  const surplus = players.length - size;
  if (surplus > 0) return shrinkSquad(doc, team, players, surplus, size, kept);
  const taken = new Set(players.map((player) => player.id));
  const added = Array.from({ length: -surplus }, (): Player => {
    const id = nextFreeId(team, taken);
    taken.add(id);
    return { id, team, family: null, slot: null, isKeeper: false };
  });
  return withSquadSize(doc, team, [...players, ...added], size);
}

function shrinkSquad(
  doc: PitchDocument,
  team: Side,
  players: Player[],
  surplus: number,
  size: SquadSize,
  kept: ReadonlySet<string>,
): PitchDocument {
  const removable = players.filter((player) => isRemovable(player) && !kept.has(player.id));
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
  doc: PitchDocument,
  team: Side,
  players: Player[],
  squadSize: SquadSize,
): PitchDocument {
  return {
    ...doc,
    teams: { ...doc.teams, [team]: { ...doc.teams[team], squadSize } },
    players: replaceTeamPlayers(doc, team, players),
  };
}

export function setKeeper(
  doc: PitchDocument,
  team: Side,
  keeper: boolean,
  data: DataSet,
): PitchDocument {
  const players = playersOf(doc, team);
  const next = keeper ? promoteKeeper(doc, players, data) : demoteKeepers(players);
  const hasKeeper = next.some((player) => player.isKeeper);
  if (next === players && doc.teams[team].keeper === hasKeeper) return doc;
  const withMeta: PitchDocument = {
    ...doc,
    teams: { ...doc.teams, [team]: { ...doc.teams[team], keeper: hasKeeper } },
    players: replaceTeamPlayers(doc, team, next),
  };
  return reconcileRoles(withMeta, data);
}

function promoteKeeper(doc: PitchDocument, players: Player[], data: DataSet): Player[] {
  if (players.some((player) => player.isKeeper)) return players;
  const choice = players.find(
    (player) => isSpare(player) && pieceLabel(doc, player, data) === GOALKEEPER_LABEL,
  );
  if (!choice) return players;
  return players.map((player) =>
    player === choice ? { ...player, family: GOALKEEPER_LABEL, isKeeper: true } : player,
  );
}

function demoteKeepers(players: Player[]): Player[] {
  if (!players.some((player) => player.isKeeper && player.slot === null)) return players;
  return players.map((player) =>
    player.isKeeper && player.slot === null ? { ...player, family: null, isKeeper: false } : player,
  );
}
