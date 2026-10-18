import { FM26_DATA } from '../data/fm26';
import type { DataSet, Side } from '../data/types';
import { createExampleDocument } from './example';
import { SIDES, createInitialDocument, type PitchDocument } from './document';
import { setSquadSize } from './layout-actions';

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
  return SIDES.reduce((blank: PitchDocument, team: Side): PitchDocument => {
    const { name, squadSize } = doc.teams[team];
    const sized = setSquadSize(blank, team, squadSize);
    return {
      ...sized,
      teams: { ...sized.teams, [team]: { ...sized.teams[team], name } },
    };
  }, createInitialDocument());
}

export function tacticFromDocument(doc: PitchDocument, mode: Mode): Tactic {
  const other = blankLike(doc);
  return mode === 'fm' ? { openPitch: other, fm: doc } : { openPitch: doc, fm: other };
}
