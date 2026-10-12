import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { applyAction } from './actions';
import { createExampleDocument } from './example';
import { createInitialDocument, type PitchDocument, type Player } from './document';
import { MAX_PIECES_PER_TEAM, documentIssues } from './validate';

const valid = createExampleDocument();

function withPlayer(update: Partial<Player>, id = 'mine-ST'): PitchDocument {
  return {
    ...valid,
    players: valid.players.map((player) => (player.id === id ? { ...player, ...update } : player)),
  };
}

const issue = (doc: PitchDocument) => documentIssues(doc, FM26_DATA);

describe('documentIssues', () => {
  it('accepts the example pitch and a blank pitch', () => {
    expect(issue(valid)).toBeNull();
    expect(issue(createInitialDocument())).toBeNull();
  });

  it('rejects duplicate piece ids', () => {
    const duplicate = { ...valid, players: [...valid.players, valid.players[0]] };
    expect(issue(duplicate)).toMatch(/not unique/);
  });

  it('rejects pieces outside the pitch', () => {
    expect(issue(withPlayer({ base: { x: -1, y: 10 } }))).toMatch(/outside the pitch/);
    expect(issue({ ...valid, ball: { x: 10, y: 101 } })).toMatch(/ball is outside/);
  });

  it('rejects over-long names', () => {
    expect(issue(withPlayer({ customName: 'z'.repeat(25) }))).toMatch(/piece name/);
    const longTeam = {
      ...valid,
      teams: { ...valid.teams, mine: { ...valid.teams.mine, name: 'z'.repeat(25) } },
    };
    expect(issue(longTeam)).toMatch(/team name/);
  });

  it('rejects an unknown formation id', () => {
    const doc = {
      ...valid,
      teams: { ...valid.teams, mine: { ...valid.teams.mine, formationId: 'x' } },
    };
    expect(issue(doc)).toMatch(/formation is unknown/);
  });

  it('rejects too many pieces on a team', () => {
    const extra: Player[] = Array.from({ length: MAX_PIECES_PER_TEAM }, (_, index) => ({
      id: `mine-extra-${index}`,
      team: 'mine',
      family: null,
      slot: null,
      isKeeper: false,
    }));
    expect(issue({ ...valid, players: [...valid.players, ...extra] })).toMatch(/too many/);
  });

  it('rejects a slot that does not belong to the team formation or has the wrong family', () => {
    expect(issue(withPlayer({ slot: 'STL' }))).toMatch(/slot outside/);
    expect(issue(withPlayer({ family: 'DM' }))).toMatch(/slot family/);
  });

  it('rejects a role that does not fit the family or possession', () => {
    const outRole = FM26_DATA.roles.find(
      (r) => r.possession === 'out' && r.families.includes('ST'),
    )!;
    expect(issue(withPlayer({ role: outRole.id }))).toMatch(/role that does not fit/);
    expect(issue(withPlayer({ role: 'nope' }))).toMatch(/role that does not fit/);
  });

  it('rejects a scenario with a bad carrier or zone', () => {
    expect(issue({ ...valid, scenario: { zone: 'C-F', carrierId: 'ghost' } })).toMatch(/carrier/);
    expect(issue({ ...valid, scenario: { zone: 'C-F', carrierId: 'opponent-ST' } })).toMatch(
      /carrier/,
    );
    const real = valid.scenario!;
    expect(issue({ ...valid, scenario: { ...real, zone: 'L-D' } })).toMatch(/does not match/);
    expect(issue({ ...valid, scenario: { ...real, zone: 'nope' as typeof real.zone } })).toMatch(
      /zone is unknown/,
    );
  });

  it('rejects a benched carrier', () => {
    const benched = applyAction(valid, {
      type: 'benchPlayer',
      playerId: valid.scenario!.carrierId,
    });
    const stale = { ...benched, scenario: valid.scenario };
    expect(issue(stale)).toMatch(/carrier/);
  });
});
