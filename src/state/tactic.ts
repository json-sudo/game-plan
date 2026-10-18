import { FM26_DATA } from '../data/fm26';
import type { DataSet } from '../data/types';
import { createExampleDocument } from './example';
import { SIDES, createInitialDocument, type PitchDocument } from './document';
import { blankTeam } from './layout-actions';

export type Mode = 'openPitch' | 'fm';

export const MODES: readonly Mode[] = ['openPitch', 'fm'];

export interface Tactic {
  openPitch: PitchDocument;
  fm: PitchDocument;
}

export interface TacticSnapshot {
  tactic: Tactic;
  mode: Mode;
}

export function createInitialTactic(): Tactic {
  return { openPitch: createInitialDocument(), fm: createInitialDocument() };
}

export function createExampleTactic(data: DataSet = FM26_DATA): Tactic {
  return { openPitch: createInitialDocument(), fm: createExampleDocument(data) };
}

export function otherMode(mode: Mode): Mode {
  return mode === 'fm' ? 'openPitch' : 'fm';
}

export function withLayout(tactic: Tactic, mode: Mode, doc: PitchDocument): Tactic {
  return tactic[mode] === doc ? tactic : { ...tactic, [mode]: doc };
}

function blankLike(doc: PitchDocument): PitchDocument {
  const roster: PitchDocument = {
    ...createInitialDocument(),
    teams: doc.teams,
    players: doc.players,
  };
  return SIDES.reduce(blankTeam, roster);
}

export function tacticFromDocument(doc: PitchDocument, mode: Mode): Tactic {
  const other = blankLike(doc);
  return mode === 'fm' ? { openPitch: other, fm: doc } : { openPitch: doc, fm: other };
}
