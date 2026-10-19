import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { applyAction } from './actions';
import { benchPieces, DEFAULT_BENCH_FORMATIONS, pieceLabel } from './bench-pieces';
import { createInitialDocument, playersOf, type PitchDocument } from './document';
import { createExampleDocument, EXAMPLE_FORMATIONS } from './example';
import { createInitialTactic } from './tactic';

const labelsOf = (pieces: ReturnType<typeof benchPieces>, team: 'mine' | 'opponent') =>
  pieces.filter((piece) => piece.team === team).map((piece) => piece.label);

const familiesOf = (formationId: string) =>
  FM26_DATA.formations
    .find((formation) => formation.id === formationId)!
    .slots.map((s) => s.family);

describe('benchPieces', () => {
  it('labels an empty pitch with 4-3-3 positions for my team and 4-2-3-1 for the opponent', () => {
    const pieces = benchPieces(createInitialDocument(), FM26_DATA);
    expect(labelsOf(pieces, 'mine')).toEqual(familiesOf(DEFAULT_BENCH_FORMATIONS.mine));
    expect(labelsOf(pieces, 'opponent')).toEqual(familiesOf(DEFAULT_BENCH_FORMATIONS.opponent));
    expect(DEFAULT_BENCH_FORMATIONS).toEqual(EXAMPLE_FORMATIONS);
  });

  it('never shows the internal piece id as the label', () => {
    const doc = createInitialDocument();
    const pieces = benchPieces(doc, FM26_DATA);
    const ids = new Set(
      playersOf(doc, 'mine')
        .concat(playersOf(doc, 'opponent'))
        .map((p) => p.id),
    );
    expect(pieces.every((piece) => !ids.has(piece.label))).toBe(true);
    expect(pieces.map((piece) => piece.id)).toEqual(doc.players.map((player) => player.id));
  });

  it('follows the formation picked for a team once its pieces return to the bench', () => {
    const picked = applyAction(
      createInitialDocument(),
      { type: 'applyFormation', team: 'mine', formationId: '4_4_2_diamond_narrow' },
      FM26_DATA,
    );
    const benched = playersOf(picked, 'mine').reduce(
      (doc, player) => applyAction(doc, { type: 'benchPlayer', playerId: player.id }, FM26_DATA),
      picked,
    );
    const pieces = benchPieces(benched, FM26_DATA);
    expect(labelsOf(pieces, 'mine')).toEqual(familiesOf('4_4_2_diamond_narrow'));
    expect(labelsOf(pieces, 'opponent')).toEqual(familiesOf(DEFAULT_BENCH_FORMATIONS.opponent));
  });

  it('names squad members beyond the formation s1, s2 and so on', () => {
    const doc = applyAction(
      createInitialDocument(),
      { type: 'setSquadSize', team: 'mine', size: 20 },
      FM26_DATA,
    );
    const mine = labelsOf(benchPieces(doc, FM26_DATA), 'mine');
    expect(mine).toHaveLength(20);
    expect(mine.slice(11)).toEqual(Array.from({ length: 9 }, (_, i) => `s${i + 1}`));
  });

  it('keeps formations independent between Open pitch and FM mode', () => {
    const tactic = createInitialTactic();
    const openPitch = applyAction(
      tactic.openPitch,
      { type: 'applyFormation', team: 'mine', formationId: '4_4_2_diamond_narrow' },
      FM26_DATA,
    );
    const next = { ...tactic, openPitch };
    expect(next.openPitch.teams.mine.formationId).toBe('4_4_2_diamond_narrow');
    expect(next.fm.teams.mine.formationId).toBeNull();
    expect(labelsOf(benchPieces(next.fm, FM26_DATA), 'mine')).toEqual(
      familiesOf(DEFAULT_BENCH_FORMATIONS.mine),
    );
  });
});

describe('pieceLabel', () => {
  const place = (doc: PitchDocument, playerId: string) =>
    applyAction(doc, { type: 'movePlayer', playerId, point: { x: 50, y: 50 } }, FM26_DATA);
  const labelOf = (doc: PitchDocument, playerId: string) =>
    pieceLabel(
      doc,
      doc.players.find((player) => player.id === playerId)!,
      FM26_DATA,
    );

  it('keeps the bench position label once a piece is placed and after it returns', () => {
    const empty = createInitialDocument();
    const third = playersOf(empty, 'mine')[2];
    const benchLabel = labelsOf(benchPieces(empty, FM26_DATA), 'mine')[2];
    const placed = place(empty, third.id);
    expect(placed.players.find((player) => player.id === third.id)!.base).toBeDefined();
    expect(labelOf(placed, third.id)).toBe(benchLabel);
    expect(labelOf(placed, third.id)).not.toBe(third.id);
    expect(labelOf(placed, third.id)).toBe(familiesOf(DEFAULT_BENCH_FORMATIONS.mine)[2]);
    const returned = applyAction(placed, { type: 'benchPlayer', playerId: third.id }, FM26_DATA);
    expect(labelsOf(benchPieces(returned, FM26_DATA), 'mine')[2]).toBe(benchLabel);
  });

  it('keeps the sN label for a placed squad extra', () => {
    const doc = applyAction(
      createInitialDocument(),
      { type: 'setSquadSize', team: 'opponent', size: 26 },
      FM26_DATA,
    );
    const extra = playersOf(doc, 'opponent')[12];
    expect(labelOf(place(doc, extra.id), extra.id)).toBe('s2');
  });

  it('does not make a placed GK piece a keeper', () => {
    const empty = createInitialDocument();
    const first = playersOf(empty, 'mine')[0];
    const placed = place(empty, first.id);
    expect(labelOf(placed, first.id)).toBe('GK');
    expect(placed.players.find((player) => player.id === first.id)!.isKeeper).toBe(false);
  });

  it('shows the formation family for pieces placed by a formation', () => {
    const doc = createExampleDocument();
    expect(doc.players.map((player) => pieceLabel(doc, player, FM26_DATA))).toEqual(
      doc.players.map((player) => player.family),
    );
  });
});
