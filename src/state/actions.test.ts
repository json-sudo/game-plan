import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import type { Point, Side } from '../data/types';
import type { ZoneId } from '../data/zones';
import { PITCH_W, layoutFormation, layoutMatchup, zoneCentre, zoneOf } from '../engine';
import { applyAction, type Action } from './actions';
import {
  createInitialDocument,
  placedPlayers,
  playersOf,
  type PitchDocument,
  type Player,
} from './document';
import { documentIssues } from './validate';
import { createExampleDocument } from './example';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

const MINE = '4_3_3_dm_wide';
const OPPONENT = '4_2_3_1_dm_wide';

function run(doc: PitchDocument, ...actions: Action[]): PitchDocument {
  return actions.reduce((current, action) => applyAction(current, action), doc);
}

function matchup(): PitchDocument {
  return run(
    createInitialDocument(),
    { type: 'applyFormation', team: 'mine', formationId: MINE },
    { type: 'applyFormation', team: 'opponent', formationId: OPPONENT },
    { type: 'applyMatchup' },
  );
}

function withZone(zone: ZoneId): PitchDocument {
  return run(matchup(), { type: 'fillDefaultRoles' }, { type: 'tapZone', zone });
}

function player(doc: PitchDocument, id: string): Player {
  const found = doc.players.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no player ${id}`);
  return found;
}

function atSlot(doc: PitchDocument, team: Side, slot: string): Player {
  const found = playersOf(doc, team).find((candidate) => candidate.slot === slot);
  if (!found) throw new Error(`no ${team} player at ${slot}`);
  return found;
}

const MINE_ST = atSlot(matchup(), 'mine', 'ST').id;
const OPPONENT_ST = atSlot(matchup(), 'opponent', 'ST').id;

function round(point: Point): Point {
  return { x: Math.round(point.x * 100) / 100, y: Math.round(point.y * 100) / 100 };
}

describe('applyFormation', () => {
  it('places the team on the formation base positions with slot ids and families', () => {
    const doc = run(createInitialDocument(), {
      type: 'applyFormation',
      team: 'mine',
      formationId: MINE,
    });
    const formation = FM26_DATA.formations.find((f) => f.id === MINE)!;
    const layout = layoutFormation(formation, 'mine');
    const mine = playersOf(doc, 'mine');
    expect(mine).toHaveLength(11);
    for (const slot of formation.slots) {
      const placed = atSlot(doc, 'mine', slot.id);
      expect(placed).toMatchObject({ slot: slot.id, family: slot.family, team: 'mine' });
      expect(placed.base).toEqual(round(layout.get(slot.id)!));
    }
    expect(atSlot(doc, 'mine', 'GK').isKeeper).toBe(true);
    expect(doc.teams.mine).toMatchObject({ formationId: MINE, keeper: true, applied: 'formation' });
    expect(playersOf(doc, 'opponent')).toEqual(playersOf(createInitialDocument(), 'opponent'));
    expect(documentIssues(doc, FM26_DATA)).toBeNull();
  });

  it('mirrors the opponent formation', () => {
    const doc = run(createInitialDocument(), {
      type: 'applyFormation',
      team: 'opponent',
      formationId: OPPONENT,
    });
    const formation = FM26_DATA.formations.find((f) => f.id === OPPONENT)!;
    const layout = layoutFormation(formation, 'opponent');
    expect(atSlot(doc, 'opponent', 'GK').base).toEqual(round(layout.get('GK')!));
    expect(atSlot(doc, 'opponent', 'GK').base!.y).toBeLessThan(50);
  });

  it('ignores an unknown formation id and returns the same document', () => {
    const doc = createInitialDocument();
    expect(applyAction(doc, { type: 'applyFormation', team: 'mine', formationId: 'nope' })).toBe(
      doc,
    );
  });

  it('keeps custom names for the same slot when the formation is applied again', () => {
    const named = run(
      createInitialDocument(),
      { type: 'applyFormation', team: 'mine', formationId: MINE },
      { type: 'setPieceName', playerId: MINE_ST, name: 'Haaland' },
      { type: 'applyFormation', team: 'mine', formationId: OPPONENT },
    );
    expect(player(named, MINE_ST).customName).toBe('Haaland');
  });

  it('returns spare pieces to the bench up to the squad size', () => {
    const doc = run(
      createInitialDocument(),
      { type: 'setSquadSize', team: 'mine', size: 20 },
      { type: 'applyFormation', team: 'mine', formationId: MINE },
    );
    const mine = playersOf(doc, 'mine');
    expect(mine).toHaveLength(20);
    expect(mine.filter((p) => p.base === undefined)).toHaveLength(9);
    expect(new Set(doc.players.map((p) => p.id)).size).toBe(doc.players.length);
    expect(documentIssues(doc, FM26_DATA)).toBeNull();
  });

  it('keeps a role that is still valid and drops one that no longer fits', () => {
    const doc = run(
      createInitialDocument(),
      { type: 'applyFormation', team: 'mine', formationId: MINE },
      { type: 'fillDefaultRoles' },
    );
    const before = player(doc, MINE_ST).role;
    const again = applyAction(doc, { type: 'applyFormation', team: 'mine', formationId: OPPONENT });
    expect(player(again, MINE_ST).role).toBe(before);
    expect(documentIssues(again, FM26_DATA)).toBeNull();
  });
});

describe('applyMatchup', () => {
  it('places both teams the way the engine lays out the matchup', () => {
    const doc = matchup();
    const formations = {
      mine: FM26_DATA.formations.find((f) => f.id === MINE)!,
      opponent: FM26_DATA.formations.find((f) => f.id === OPPONENT)!,
    };
    const layouts = layoutMatchup('mine', formations);
    for (const team of ['mine', 'opponent'] as const) {
      for (const [slotId, point] of layouts[team]) {
        expect(atSlot(doc, team, slotId).base).toEqual(round(point));
      }
    }
    expect(doc.teams.mine.applied).toBe('matchup');
    expect(doc.teams.opponent.applied).toBe('matchup');
    expect(documentIssues(doc, FM26_DATA)).toBeNull();
  });

  it('does nothing until both teams have a formation', () => {
    const doc = run(createInitialDocument(), {
      type: 'applyFormation',
      team: 'mine',
      formationId: MINE,
    });
    expect(applyAction(doc, { type: 'applyMatchup' })).toBe(doc);
  });

  it('uses the current attacker', () => {
    const doc = run(
      matchup(),
      { type: 'setAttacker', attacker: 'opponent' },
      { type: 'applyMatchup' },
    );
    const formations = {
      mine: FM26_DATA.formations.find((f) => f.id === MINE)!,
      opponent: FM26_DATA.formations.find((f) => f.id === OPPONENT)!,
    };
    const layouts = layoutMatchup('opponent', formations);
    expect(atSlot(doc, 'opponent', 'ST').base).toEqual(round(layouts.opponent.get('ST')!));
  });
});

describe('setAttacker', () => {
  it('is a no-op for the current attacker', () => {
    const doc = matchup();
    expect(applyAction(doc, { type: 'setAttacker', attacker: 'mine' })).toBe(doc);
  });

  it('swaps the possession of roles and keeps the zone', () => {
    const start = withZone('C-F');
    expect(start.scenario).not.toBeNull();
    const flipped = applyAction(start, { type: 'setAttacker', attacker: 'opponent' });
    expect(flipped.attacker).toBe('opponent');
    expect(flipped.scenario).toEqual({ zone: 'C-F', sequenceIndex: 0 });
    expect(zoneOf(flipped.ball, 'opponent')).toBe('C-F');
    const roleOf = (id: string) => FM26_DATA.roles.find((r) => r.id === player(flipped, id).role)!;
    expect(roleOf(MINE_ST).possession).toBe('out');
    expect(roleOf(OPPONENT_ST).possession).toBe('in');
    expect(documentIssues(flipped, FM26_DATA)).toBeNull();
  });
});

describe('team and squad settings', () => {
  it('renames a team, trimming and capping at 24 characters', () => {
    const doc = createInitialDocument();
    expect(
      applyAction(doc, { type: 'renameTeam', team: 'mine', name: '  Arsenal  ' }).teams.mine.name,
    ).toBe('Arsenal');
    expect(
      applyAction(doc, { type: 'renameTeam', team: 'mine', name: 'x'.repeat(40) }).teams.mine.name,
    ).toHaveLength(24);
  });

  it('falls back to the default name for a blank team name', () => {
    const doc = applyAction(createInitialDocument(), {
      type: 'renameTeam',
      team: 'opponent',
      name: '   ',
    });
    expect(doc.teams.opponent.name).toBe('Opponent');
  });

  it('grows the squad with benched pieces and shrinks it by dropping benched ones', () => {
    const grown = applyAction(createInitialDocument(), {
      type: 'setSquadSize',
      team: 'mine',
      size: 20,
    });
    expect(playersOf(grown, 'mine')).toHaveLength(20);
    expect(grown.teams.mine.squadSize).toBe(20);
    expect(new Set(grown.players.map((p) => p.id)).size).toBe(grown.players.length);
    const shrunk = applyAction(grown, { type: 'setSquadSize', team: 'mine', size: 11 });
    expect(playersOf(shrunk, 'mine')).toHaveLength(11);
  });

  it('refuses to shrink below the number of placed pieces', () => {
    const placed = run(
      createInitialDocument(),
      { type: 'setSquadSize', team: 'mine', size: 20 },
      ...playersOf(createInitialDocument(), 'mine').map((p): Action => ({
        type: 'movePlayer',
        playerId: p.id,
        point: { x: 30, y: 60 },
      })),
      { type: 'movePlayer', playerId: 'mine-12', point: { x: 30, y: 60 } },
    );
    expect(applyAction(placed, { type: 'setSquadSize', team: 'mine', size: 11 })).toBe(placed);
  });

  it('resizes the bench only, leaving every placed piece where it is', () => {
    const placed = run(createInitialDocument(), {
      type: 'movePlayer',
      playerId: 'mine-3',
      point: { x: 20, y: 40 },
    });
    const grown = applyAction(placed, { type: 'setSquadSize', team: 'mine', size: 26 });
    expect(grown.players.filter((p) => p.base)).toEqual(placed.players.filter((p) => p.base));
    const shrunk = applyAction(grown, { type: 'setSquadSize', team: 'mine', size: 11 });
    expect(shrunk.players.filter((p) => p.base)).toEqual(placed.players.filter((p) => p.base));
    expect(playersOf(shrunk, 'mine').filter((p) => !p.base)).toHaveLength(10);
  });

  it('adds and removes a keeper', () => {
    const doc = createInitialDocument();
    const withKeeper = applyAction(doc, { type: 'setKeeper', team: 'mine', keeper: true });
    expect(withKeeper.teams.mine.keeper).toBe(true);
    const keepers = playersOf(withKeeper, 'mine').filter((p) => p.isKeeper);
    expect(keepers).toHaveLength(1);
    expect(keepers[0].family).toBe('GK');
    expect(applyAction(withKeeper, { type: 'setKeeper', team: 'mine', keeper: true })).toBe(
      withKeeper,
    );
    const without = applyAction(withKeeper, { type: 'setKeeper', team: 'mine', keeper: false });
    expect(playersOf(without, 'mine').some((p) => p.isKeeper)).toBe(false);
    expect(without.teams.mine.keeper).toBe(false);
  });

  it('keeps the formation goalkeeper when the keeper is switched off', () => {
    const doc = matchup();
    expect(applyAction(doc, { type: 'setKeeper', team: 'mine', keeper: false })).toBe(doc);
  });
});

describe('roles and names', () => {
  it('sets a valid role and rejects one with the wrong possession or family', () => {
    const doc = matchup();
    const inRole = FM26_DATA.roles.find((r) => r.possession === 'in' && r.families.includes('ST'))!;
    const outRole = FM26_DATA.roles.find(
      (r) => r.possession === 'out' && r.families.includes('ST'),
    )!;
    const gkRole = FM26_DATA.roles.find((r) => r.possession === 'in' && r.families.includes('GK'))!;
    expect(
      player(run(doc, { type: 'setRole', playerId: MINE_ST, roleId: inRole.id }), MINE_ST).role,
    ).toBe(inRole.id);
    expect(applyAction(doc, { type: 'setRole', playerId: MINE_ST, roleId: outRole.id })).toBe(doc);
    expect(applyAction(doc, { type: 'setRole', playerId: MINE_ST, roleId: gkRole.id })).toBe(doc);
    expect(applyAction(doc, { type: 'setRole', playerId: MINE_ST, roleId: 'nope' })).toBe(doc);
    expect(applyAction(doc, { type: 'setRole', playerId: 'ghost', roleId: inRole.id })).toBe(doc);
  });

  it('accepts Wide Centre-Back only on an outermost centre-back of a three-back formation', () => {
    const wide = 'wide_centre_back_ip';
    const threeBack = run(
      createInitialDocument(),
      { type: 'applyFormation', team: 'mine', formationId: '3_4_3_dm_wide' },
      { type: 'applyFormation', team: 'opponent', formationId: OPPONENT },
      { type: 'applyMatchup' },
    );
    const outerId = atSlot(threeBack, 'mine', 'DCL').id;
    const outer = run(threeBack, { type: 'setRole', playerId: outerId, roleId: wide });
    expect(player(outer, outerId).role).toBe(wide);
    expect(documentIssues(outer, FM26_DATA)).toBeNull();
    const middleId = atSlot(threeBack, 'mine', 'DC').id;
    expect(applyAction(threeBack, { type: 'setRole', playerId: middleId, roleId: wide })).toBe(
      threeBack,
    );
    const fourBack = matchup();
    const fourBackId = atSlot(fourBack, 'mine', 'DCL').id;
    expect(applyAction(fourBack, { type: 'setRole', playerId: fourBackId, roleId: wide })).toBe(
      fourBack,
    );
  });

  it('clears a role with null', () => {
    const doc = run(matchup(), { type: 'fillDefaultRoles' });
    const cleared = applyAction(doc, { type: 'setRole', playerId: MINE_ST, roleId: null });
    expect(player(cleared, MINE_ST).role).toBeUndefined();
  });

  it('fills default roles only where missing', () => {
    const doc = matchup();
    const filled = applyAction(doc, { type: 'fillDefaultRoles' });
    expect(placedPlayers(filled).every((p) => p.role !== undefined)).toBe(true);
    expect(documentIssues(filled, FM26_DATA)).toBeNull();
    expect(applyAction(filled, { type: 'fillDefaultRoles' })).toBe(filled);
  });

  it('sets, trims, caps and clears a custom piece name', () => {
    const doc = matchup();
    const named = applyAction(doc, { type: 'setPieceName', playerId: MINE_ST, name: '  Ada  ' });
    expect(player(named, MINE_ST).customName).toBe('Ada');
    const capped = applyAction(doc, {
      type: 'setPieceName',
      playerId: MINE_ST,
      name: 'y'.repeat(30),
    });
    expect(player(capped, MINE_ST).customName).toHaveLength(24);
    const cleared = applyAction(named, { type: 'setPieceName', playerId: MINE_ST, name: '  ' });
    expect(player(cleared, MINE_ST)).not.toHaveProperty('customName');
    expect(applyAction(doc, { type: 'setPieceName', playerId: 'ghost', name: 'x' })).toBe(doc);
  });
});

describe('moving pieces', () => {
  it('moves a player to a rounded, clamped position', () => {
    const doc = matchup();
    const moved = applyAction(doc, {
      type: 'movePlayer',
      playerId: MINE_ST,
      point: { x: 20.12345, y: 30.98765 },
    });
    expect(player(moved, MINE_ST).base).toEqual({ x: 20.12, y: 30.99 });
    const outside = applyAction(doc, {
      type: 'movePlayer',
      playerId: MINE_ST,
      point: { x: -50, y: 500 },
    });
    expect(player(outside, MINE_ST).base).toEqual({ x: 0, y: 100 });
    const right = applyAction(doc, {
      type: 'movePlayer',
      playerId: MINE_ST,
      point: { x: 500, y: 50 },
    });
    expect(player(right, MINE_ST).base!.x).toBe(PITCH_W);
  });

  it('places a benched piece and benches a placed one', () => {
    const blank = createInitialDocument();
    const placed = applyAction(blank, {
      type: 'movePlayer',
      playerId: 'mine-1',
      point: { x: 10, y: 10 },
    });
    expect(player(placed, 'mine-1').base).toEqual({ x: 10, y: 10 });
    const benched = applyAction(placed, { type: 'benchPlayer', playerId: 'mine-1' });
    expect(player(benched, 'mine-1').base).toBeUndefined();
    expect(applyAction(benched, { type: 'benchPlayer', playerId: 'mine-1' })).toBe(benched);
    expect(
      applyAction(blank, { type: 'movePlayer', playerId: 'ghost', point: { x: 1, y: 1 } }),
    ).toBe(blank);
  });

  it('benching a player keeps the zone and the ball', () => {
    const doc = withZone('C-F');
    const benched = applyAction(doc, {
      type: 'benchPlayer',
      playerId: exampleSlotId('mine', 'DM'),
    });
    expect(benched.scenario).toEqual(doc.scenario);
    expect(benched.ball).toEqual(doc.ball);
  });

  it('moving a player keeps the zone', () => {
    const doc = withZone('C-F');
    const moved = applyAction(doc, {
      type: 'movePlayer',
      playerId: exampleSlotId('mine', 'AMCL'),
      point: { x: 38, y: 19 },
    });
    expect(moved.scenario).toEqual(doc.scenario);
  });
});

describe('scenario actions', () => {
  it('tapZone puts the ball at the zone centre and records the zone', () => {
    const doc = run(matchup(), { type: 'fillDefaultRoles' });
    const result = applyAction(doc, { type: 'tapZone', zone: 'R-F' });
    expect(result.ball).toEqual(round(zoneCentre('R-F', 'mine')));
    expect(result.scenario).toEqual({ zone: 'R-F', sequenceIndex: 0 });
    expect(result.players).toBe(doc.players);
    expect(documentIssues(result, FM26_DATA)).toBeNull();
  });

  it('tapZone on the chosen zone changes nothing', () => {
    const doc = withZone('R-F');
    expect(applyAction(doc, { type: 'tapZone', zone: 'R-F' })).toBe(doc);
  });

  it('tapZone on an empty pitch only moves the ball', () => {
    const doc = applyAction(createInitialDocument(), { type: 'tapZone', zone: 'L-D' });
    expect(doc.scenario).toEqual({ zone: 'L-D', sequenceIndex: 0 });
    expect(doc.ball).not.toEqual(createInitialDocument().ball);
  });

  it('placeBall moves only the ball, clamped to the pitch', () => {
    const doc = matchup();
    const result = applyAction(doc, { type: 'placeBall', point: { x: 70, y: 10 } });
    expect(result.ball).toEqual({ x: 70, y: 10 });
    expect(result.players).toBe(doc.players);
    expect(result.scenario).toBeNull();
    const outside = applyAction(doc, { type: 'placeBall', point: { x: -20, y: 400 } });
    expect(outside.ball.x).toBeGreaterThanOrEqual(0);
    expect(outside.ball.y).toBeLessThanOrEqual(100);
    expect(applyAction(result, { type: 'placeBall', point: { x: 70, y: 10 } })).toBe(result);
  });

  it('placeBall never attaches the ball to a player or picks a carrier', () => {
    const doc = matchup();
    const onStriker = applyAction(doc, {
      type: 'placeBall',
      point: player(doc, exampleSlotId('mine', 'ST')).base!,
    });
    expect(onStriker.scenario).toBeNull();
  });

  it('placeBall drops the zone the ball has left', () => {
    const doc = withZone('C-F');
    const moved = applyAction(doc, { type: 'placeBall', point: { x: 10, y: 80 } });
    expect(moved.scenario).toBeNull();
    expect(documentIssues(moved, FM26_DATA)).toBeNull();
  });

  it('clearScenario removes the zone and keeps the ball', () => {
    const doc = withZone('C-M');
    const cleared = applyAction(doc, { type: 'clearScenario' });
    expect(cleared.scenario).toBeNull();
    expect(cleared.ball).toEqual(doc.ball);
    expect(applyAction(cleared, { type: 'clearScenario' })).toBe(cleared);
  });
});

describe('reset', () => {
  it('returns a matchup pitch to the matchup layout and drops the scenario', () => {
    const base = matchup();
    const dirty = run(
      base,
      { type: 'movePlayer', playerId: MINE_ST, point: { x: 5, y: 5 } },
      { type: 'tapZone', zone: 'L-F' },
    );
    const reset = applyAction(dirty, { type: 'reset' });
    expect(reset.players).toEqual(base.players);
    expect(reset.scenario).toBeNull();
    expect(reset.teams).toEqual(base.teams);
  });

  it('re-applies a plain formation for teams placed that way', () => {
    const base = run(createInitialDocument(), {
      type: 'applyFormation',
      team: 'mine',
      formationId: MINE,
    });
    const dirty = applyAction(base, {
      type: 'movePlayer',
      playerId: MINE_ST,
      point: { x: 5, y: 5 },
    });
    expect(applyAction(dirty, { type: 'reset' }).players).toEqual(base.players);
  });

  it('returns a blank pitch to its starting pieces while keeping team names', () => {
    const dirty = run(
      createInitialDocument(),
      { type: 'renameTeam', team: 'mine', name: 'Reds' },
      { type: 'movePlayer', playerId: 'mine-1', point: { x: 5, y: 5 } },
    );
    const reset = applyAction(dirty, { type: 'reset' });
    expect(reset.teams.mine.name).toBe('Reds');
    expect(placedPlayers(reset)).toHaveLength(0);
  });
});

describe('purity', () => {
  it('never mutates the input document', () => {
    const doc = matchup();
    const snapshot = structuredClone(doc);
    run(
      doc,
      { type: 'tapZone', zone: 'R-F' },
      { type: 'movePlayer', playerId: MINE_ST, point: { x: 1, y: 1 } },
      { type: 'setAttacker', attacker: 'opponent' },
      { type: 'fillDefaultRoles' },
      { type: 'reset' },
    );
    expect(doc).toEqual(snapshot);
  });
});
