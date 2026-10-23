import type { FormationDef, FormationSlot, MovementTable, Point, Side } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { layoutFormation } from '../layout/formations';
import { eligibleCarrierIds, type CarrierPlayer, type LateralSide } from './carrier-eligibility';
import type { FmPlayer } from './player';
import { chooseReceiver } from './receiver';
import { computeZoneShape } from './shape';
import { laneOf, thirdOf, zoneCentre, zoneOf } from './zones';

const UNSLOTTED = Number.POSITIVE_INFINITY;
const SIDES: readonly Side[] = ['mine', 'opponent'];
const GOALKEEPER = 'GK';

const OPEN_MIN_PASSES = 4;
const OPEN_MAX_PASSES = 6;
const FINAL_FLANK_PASSES = 2;
const FINAL_CENTRE_PASSES = 1;

export interface VisualizationInput {
  zone: ZoneId;
  attacker: Side;
  formations: Record<Side, FormationDef | null>;
  roles: Readonly<Record<string, string | undefined>>;
  movement: MovementTable;
}

export interface VisualizationFrame {
  positions: Record<string, Point>;
  ball: Point;
}

export interface Pass {
  carrierId: string;
  receiverId: string;
  frame: VisualizationFrame;
}

export interface Visualization {
  starterId: string;
  opening: VisualizationFrame;
  passes: Pass[];
}

interface Member {
  id: string;
  team: Side;
  slot: FormationSlot;
  base: Point;
  roleId: string | undefined;
}

interface ChainContext {
  input: VisualizationInput;
  members: readonly Member[];
  teammateIds: readonly string[];
  opponentIds: readonly string[];
}

interface ChainStep {
  carrierId: string;
  passerId: string | null;
  frame: VisualizationFrame;
  passes: readonly Pass[];
}

function lateralSideOf(slot: FormationSlot): LateralSide | undefined {
  if (slot.family.endsWith('(L)') || slot.id.endsWith('L')) return 'left';
  if (slot.family.endsWith('(R)') || slot.id.endsWith('R')) return 'right';
  return undefined;
}

function membersOf(input: VisualizationInput): Member[] {
  return SIDES.flatMap((team) => {
    const formation = input.formations[team];
    if (!formation) return [];
    const layout = layoutFormation(formation, team);
    return formation.slots.map((slot) => ({
      id: `${team}:${slot.id}`,
      team,
      slot,
      base: layout.get(slot.id)!,
      roleId: input.roles[`${team}:${slot.id}`],
    }));
  });
}

function isKeeper(member: Member): boolean {
  return member.slot.family === GOALKEEPER;
}

function carrierPlayersOf(members: readonly Member[], attacker: Side): CarrierPlayer[] {
  return members
    .filter((member) => member.team === attacker)
    .map((member) => ({
      id: member.id,
      roleId: member.roleId,
      family: member.slot.family,
      slot: member.slot.id,
      side: lateralSideOf(member.slot),
    }));
}

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

function fmPlayersOf(members: readonly Member[]): FmPlayer[] {
  return members.map((member) => ({
    id: member.id,
    team: member.team,
    base: member.base,
    roleId: member.roleId,
    isKeeper: isKeeper(member),
  }));
}

function frameFor(
  input: VisualizationInput,
  members: readonly Member[],
  zone: ZoneId,
  carrierId: string,
): VisualizationFrame {
  const { positions, ball } = computeZoneShape({
    attacker: input.attacker,
    players: fmPlayersOf(members),
    ball: zoneCentre(zone, input.attacker),
    carrierId,
    zone,
    movement: input.movement,
  });
  return { positions: Object.fromEntries(positions), ball };
}

function isChainComplete(startZone: ZoneId, landingZone: ZoneId, count: number): boolean {
  if (thirdOf(startZone) === 'F') {
    return count >= (laneOf(startZone) === 'C' ? FINAL_CENTRE_PASSES : FINAL_FLANK_PASSES);
  }
  if (count >= OPEN_MAX_PASSES) return true;
  return count >= OPEN_MIN_PASSES && thirdOf(landingZone) === 'F';
}

function extendChain(context: ChainContext, step: ChainStep): Pass[] {
  const { input, members, teammateIds, opponentIds } = context;
  const receiverId = chooseReceiver({
    attacker: input.attacker,
    carrierId: step.carrierId,
    passerId: step.passerId,
    teammateIds,
    opponentIds,
    positions: step.frame.positions,
  });
  if (receiverId === null) return [...step.passes];
  const landingZone = zoneOf(step.frame.positions[receiverId], input.attacker);
  const pass: Pass = {
    carrierId: step.carrierId,
    receiverId,
    frame: frameFor(input, members, landingZone, receiverId),
  };
  const passes = [...step.passes, pass];
  if (isChainComplete(input.zone, landingZone, passes.length)) return passes;
  return extendChain(context, {
    carrierId: receiverId,
    passerId: step.carrierId,
    frame: pass.frame,
    passes,
  });
}

function visualizationWith(
  input: VisualizationInput,
  members: readonly Member[],
  starterId: string,
): Visualization {
  const opening = frameFor(input, members, input.zone, starterId);
  const outfieldIds = (team: Side) =>
    members
      .filter((member) => member.team === team && !isKeeper(member))
      .map((member) => member.id);
  const context: ChainContext = {
    input,
    members,
    teammateIds: outfieldIds(input.attacker),
    opponentIds: outfieldIds(input.attacker === 'mine' ? 'opponent' : 'mine'),
  };
  return {
    starterId,
    opening,
    passes: extendChain(context, {
      carrierId: starterId,
      passerId: null,
      frame: opening,
      passes: [],
    }),
  };
}

export function buildVisualization(input: VisualizationInput, starterId: string): Visualization {
  return visualizationWith(input, membersOf(input), starterId);
}

export function visualizationsFor(input: VisualizationInput): Visualization[] {
  const members = membersOf(input);
  const attacking = input.formations[input.attacker];
  if (!attacking) return [];
  const starters = visualizationStarters(
    input.zone,
    carrierPlayersOf(members, input.attacker),
    attacking.slots,
  );
  return starters.map((starterId) => visualizationWith(input, members, starterId));
}
