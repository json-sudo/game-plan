import { FM26_DATA } from '../data/fm26';
import type { Side } from '../data/types';
import { visualizationsFor, type Visualization, type VisualizationFrame } from '../engine';
import { formationOf, isSetupComplete, type PitchDocument } from './document';

export interface FmVisualization {
  starterId: string;
  passes: Visualization['passes'];
  frames: VisualizationFrame[];
  index: number;
  total: number;
}

const cache = new WeakMap<PitchDocument, Visualization[]>();

function rolesOf(doc: PitchDocument): Record<string, string | undefined> {
  return Object.fromEntries(
    doc.players
      .filter((player) => player.slot !== null)
      .map((player) => [`${player.team}:${player.slot}`, player.role]),
  );
}

function visualizationsOf(doc: PitchDocument): Visualization[] {
  if (!doc.scenario) return [];
  const cached = cache.get(doc);
  if (cached) return cached;
  const formation = (team: Side) => formationOf(FM26_DATA, doc.teams[team].formationId);
  const computed = visualizationsFor({
    zone: doc.scenario.zone,
    attacker: doc.attacker,
    formations: { mine: formation('mine'), opponent: formation('opponent') },
    roles: rolesOf(doc),
    movement: FM26_DATA.movement,
  });
  cache.set(doc, computed);
  return computed;
}

export function fmVisualization(doc: PitchDocument): FmVisualization | null {
  if (!doc.scenario || !isSetupComplete(doc)) return null;
  const all = visualizationsOf(doc);
  if (all.length === 0) return null;
  const index = doc.scenario.sequenceIndex % all.length;
  const current = all[index];
  return {
    starterId: current.starterId,
    passes: current.passes,
    frames: [current.opening, ...current.passes.map((pass) => pass.frame)],
    index,
    total: all.length,
  };
}

function withSequenceIndex(doc: PitchDocument, step: number): PitchDocument {
  if (!doc.scenario) return doc;
  const total = visualizationsOf(doc).length;
  const sequenceIndex = total === 0 ? 0 : (doc.scenario.sequenceIndex + step) % total;
  if (doc.scenario.sequenceIndex === sequenceIndex) return doc;
  return { ...doc, scenario: { ...doc.scenario, sequenceIndex } };
}

export function wrapSequenceIndex(doc: PitchDocument): PitchDocument {
  return withSequenceIndex(doc, 0);
}

export function nextVisualization(doc: PitchDocument): PitchDocument {
  return withSequenceIndex(doc, 1);
}
