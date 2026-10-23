import { FM26_DATA } from '../../data/fm26';
import {
  defaultRoleFor,
  isRoleValidFor,
  isSetupComplete,
  possessionOf,
  type PitchDocument,
  type Player,
} from '../../state/document';
import { NO_OPPONENT_LABEL, NO_OPPONENT_SUMMARY, VERSUS_LABEL } from '../copy';
import type { StepState } from './SetupStepper';

export type SetupCursor = 1 | 2 | 3 | null;

const FORMATION_CARD_COUNT = 2;
export const NO_OPPONENT_VALUE = 'none';

const FORMATION_OPTIONS = FM26_DATA.formations.map((formation) => ({
  label: formation.name,
  value: formation.id,
}));

export const FORMATION_CARDS = FORMATION_OPTIONS.slice(0, FORMATION_CARD_COUNT);
export const FORMATION_MORE = FORMATION_OPTIONS.slice(FORMATION_CARD_COUNT);
export const OPPONENT_CARDS = [
  { label: NO_OPPONENT_LABEL, value: NO_OPPONENT_VALUE },
  ...FORMATION_CARDS,
];

export function formationLabel(id: string | null) {
  if (!id) return null;
  return FM26_DATA.formations.find((formation) => formation.id === id)?.name ?? null;
}

export function formationSummary(doc: PitchDocument) {
  const mine = formationLabel(doc.teams.mine.formationId);
  if (!mine) return undefined;
  const opponent = formationLabel(doc.teams.opponent.formationId);
  return opponent ? `${mine} ${VERSUS_LABEL} ${opponent}` : `${mine} · ${NO_OPPONENT_SUMMARY}`;
}

export function isRoleChanged(doc: PitchDocument, player: Player) {
  return player.role !== defaultRoleFor(FM26_DATA, player.family, possessionOf(doc, player.team));
}

export function setupStepNumbers(doc: PitchDocument): Array<1 | 2 | 3> {
  return doc.teams.opponent.formationId === null ? [1, 3] : [1, 2, 3];
}

export function setupCursor(doc: PitchDocument, setupStep: SetupCursor | undefined): SetupCursor {
  if (setupStep && setupStepNumbers(doc).includes(setupStep)) return setupStep;
  return isSetupComplete(doc) ? null : 1;
}

export function stepMark(
  index: 1 | 2 | 3,
  cursor: SetupCursor,
  complete: boolean,
): { state: StepState; reopened: boolean } {
  if (cursor === null) return { state: 'done', reopened: false };
  if (complete) {
    return index === cursor
      ? { state: 'active', reopened: true }
      : { state: 'done', reopened: false };
  }
  if (index < cursor) return { state: 'done', reopened: false };
  if (index === cursor) return { state: 'active', reopened: false };
  return { state: 'todo', reopened: false };
}

export function roleOptions(doc: PitchDocument, player: Player) {
  return FM26_DATA.roles.filter((role) => isRoleValidFor(doc, FM26_DATA, player, role.id));
}
