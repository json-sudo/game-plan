import { FM26_DATA } from '../../data/fm26';
import { placedPlayers, possessionOf, type PitchDocument, type Player } from '../../state/document';
import { VERSUS_LABEL } from '../copy';
import type { StepState } from './SetupStepper';

export type SetupCursor = 1 | 2 | 3 | null;

export const FORMATION_OPTIONS = FM26_DATA.formations.map((formation) => ({
  label: formation.name,
  value: formation.id,
}));

export function formationLabel(id: string | null) {
  if (!id) return null;
  return FM26_DATA.formations.find((formation) => formation.id === id)?.name ?? null;
}

export function formationSummary(doc: PitchDocument) {
  const mine = formationLabel(doc.teams.mine.formationId);
  const opponent = formationLabel(doc.teams.opponent.formationId);
  if (!mine || !opponent) return undefined;
  return `${mine} ${VERSUS_LABEL} ${opponent}`;
}

export function setupComplete(doc: PitchDocument) {
  const placed = placedPlayers(doc);
  return (
    doc.teams.mine.formationId !== null &&
    doc.teams.opponent.formationId !== null &&
    placed.length > 0 &&
    placed.every((player) => player.role !== undefined)
  );
}

export function setupCursor(doc: PitchDocument, setupStep: SetupCursor | undefined): SetupCursor {
  return setupStep ?? (setupComplete(doc) ? null : 1);
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
  if (!player.family) return [];
  const family = player.family;
  const possession = possessionOf(doc, player.team);
  return FM26_DATA.roles.filter(
    (role) => role.possession === possession && role.families.includes(family),
  );
}
