import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { visualizationsFor } from '../engine';
import { activeRoleOf } from './context';
import { formationOf, type PitchDocument } from './document';
import { createExampleDocument } from './example';
import { documentIssues } from './validate';
import { fmVisualization } from './visualization';

const INVALID_ROLES = [
  'not_a_role',
  'goalkeeper_oop',
  'centre_back_ip',
  'overlapping_centre_back_ip',
];

function withRole(doc: PitchDocument, slot: string, role: string): PitchDocument {
  return {
    ...doc,
    players: doc.players.map((player) =>
      player.team === 'mine' && player.slot === slot ? { ...player, role } : player,
    ),
  };
}

function roleFreeOpening(doc: PitchDocument, omittedSlot: string) {
  const roles = Object.fromEntries(
    doc.players
      .filter(
        (player) =>
          player.slot !== null && !(player.team === 'mine' && player.slot === omittedSlot),
      )
      .map((player) => [`${player.team}:${player.slot}`, player.role]),
  );
  const [first] = visualizationsFor({
    zone: doc.scenario!.zone,
    attacker: doc.attacker,
    formations: {
      mine: formationOf(FM26_DATA, doc.teams.mine.formationId),
      opponent: formationOf(FM26_DATA, doc.teams.opponent.formationId),
    },
    roles,
  });
  return first.opening;
}

describe('invalid imported role assignments', () => {
  const example = createExampleDocument();
  const slot = example.players.find(
    (player) => player.team === 'mine' && player.family === 'D(L)',
  )!.slot!;

  it('are rejected by the existing document validation', () => {
    for (const role of INVALID_ROLES) {
      expect(documentIssues(withRole(example, slot, role), FM26_DATA)).toMatch(
        /role that does not fit/,
      );
    }
  });

  it('resolve to no role through the existing active-role check', () => {
    for (const role of INVALID_ROLES) {
      const doc = withRole(example, slot, role);
      const player = doc.players.find((p) => p.team === 'mine' && p.slot === slot)!;
      expect(activeRoleOf(doc, player, FM26_DATA)).toBeUndefined();
    }
  });

  it('fall back to the family anchor instead of a visual override', () => {
    for (const role of INVALID_ROLES) {
      const doc = withRole(example, slot, role);
      const [opening] = fmVisualization(doc)!.frames;
      expect(opening.positions[`mine:${slot}`]).toEqual(
        roleFreeOpening(doc, slot).positions[`mine:${slot}`],
      );
    }
  });
});
