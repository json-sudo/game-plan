import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import {
  createExampleDocument,
  EXAMPLE_CARRIER,
  EXAMPLE_FORMATIONS,
  EXAMPLE_ZONE,
} from './example';
import { placedPlayers } from './document';
import { documentIssues } from './validate';

describe('createExampleDocument', () => {
  it('is the 4-3-3 DM Wide against 4-2-3-1 DM Wide matchup, valid and fully roled', () => {
    const doc = createExampleDocument();
    expect(doc.teams.mine.formationId).toBe(EXAMPLE_FORMATIONS.mine);
    expect(doc.teams.opponent.formationId).toBe(EXAMPLE_FORMATIONS.opponent);
    expect(doc.attacker).toBe('mine');
    expect(placedPlayers(doc)).toHaveLength(22);
    expect(doc.players.every((p) => p.role !== undefined)).toBe(true);
    expect(doc.scenario).toEqual({ zone: EXAMPLE_ZONE, carrierId: EXAMPLE_CARRIER });
    expect(documentIssues(doc, FM26_DATA)).toBeNull();
  });
});
