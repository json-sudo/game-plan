import { FM26_DATA } from '../data/fm26';
import type { Point, Side } from '../data/types';
import type { ZoneId } from '../data/zones';
import { PHASES, PROVISIONAL_POSITION_ENGINE, type Phase } from '../engine';
import type { PhaseResult } from '../engine/fm/phases';
import { phasePlayersOf } from './context';
import type { PitchDocument, Player } from './document';
import type { PitchStore, DragState } from './store';

export type PhasePositions = Record<Phase, Map<string, Point>>;

const phaseCache = new WeakMap<PitchDocument, PhasePositions>();
const baseCache = new WeakMap<PitchDocument, PhasePositions>();
const resultCache = new WeakMap<PitchDocument, PhaseResult>();
const teamCache = new WeakMap<PitchDocument, Record<Side, Player[]>>();
const dragCache = new WeakMap<
  DragState,
  { base: Map<string, Point>; result: Map<string, Point> }
>();

function basePositions(doc: PitchDocument): PhasePositions {
  const base = new Map(
    doc.players.flatMap((player) => (player.base ? [[player.id, player.base] as const] : [])),
  );
  return Object.fromEntries(PHASES.map((phase) => [phase, base])) as PhasePositions;
}

function computeDocumentPhases(doc: PitchDocument): PhasePositions {
  if (!doc.scenario) return basePositions(doc);
  return computeDocumentPhaseResult(doc).positions;
}

function computeDocumentPhaseResult(doc: PitchDocument): PhaseResult {
  if (!doc.scenario) return { status: 'ready', positions: basePositions(doc) };
  return PROVISIONAL_POSITION_ENGINE({
    attacker: doc.attacker,
    players: phasePlayersOf(doc, FM26_DATA),
    ball: doc.ball,
    carrierId: doc.scenario.carrierId,
    tables: {
      movement: FM26_DATA.movement,
      shapeLineShift: FM26_DATA.shapeLineShift,
      lineShift: FM26_DATA.lineShift,
    },
  });
}

export function selectPhaseResult(doc: PitchDocument): PhaseResult {
  const cached = resultCache.get(doc);
  if (cached) return cached;
  const result = computeDocumentPhaseResult(doc);
  resultCache.set(doc, result);
  return result;
}

const NO_UNFINISHED_ZONES: readonly ZoneId[] = [];

export function selectUnfinishedZones(doc: PitchDocument): readonly ZoneId[] {
  if (!doc.scenario || selectPhaseResult(doc).status !== 'setup-not-finished') {
    return NO_UNFINISHED_ZONES;
  }
  return [doc.scenario.zone];
}

export function selectPhasePositions(doc: PitchDocument): PhasePositions {
  const cached = phaseCache.get(doc);
  if (cached) return cached;
  const computed = computeDocumentPhases(doc);
  phaseCache.set(doc, computed);
  return computed;
}

function selectBasePositions(doc: PitchDocument): PhasePositions {
  const cached = baseCache.get(doc);
  if (cached) return cached;
  const computed = basePositions(doc);
  baseCache.set(doc, computed);
  return computed;
}

export function selectTeamPlayers(doc: PitchDocument, team: Side): Player[] {
  const cached = teamCache.get(doc);
  if (cached) return cached[team];
  const grouped: Record<Side, Player[]> = {
    mine: doc.players.filter((player) => player.team === 'mine'),
    opponent: doc.players.filter((player) => player.team === 'opponent'),
  };
  teamCache.set(doc, grouped);
  return grouped[team];
}

export function selectDisplayPositions(state: PitchStore): Map<string, Point> {
  const phases =
    state.ui.mode === 'fm' ? selectPhasePositions(state.doc) : selectBasePositions(state.doc);
  const positions = phases[state.ui.phase];
  const { drag } = state.ui;
  if (!drag || drag.target.kind !== 'player') return positions;
  const cached = dragCache.get(drag);
  if (cached?.base === positions) return cached.result;
  const result = new Map(positions).set(drag.target.id, drag.point);
  dragCache.set(drag, { base: positions, result });
  return result;
}

export function selectCanUndo(state: PitchStore): boolean {
  return state.history.past.length > 0;
}

export function selectCanRedo(state: PitchStore): boolean {
  return state.history.future.length > 0;
}
