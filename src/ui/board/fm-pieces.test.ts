import { describe, expect, it } from 'vitest';
import { PITCH_H } from '../../engine';
import { createInitialDocument } from '../../state/document';
import { createExampleDocument } from '../../state/example';
import { selectFmVisualization } from '../../state/selectors';
import { createPitchStore } from '../../state/store';
import { fmWantedPieces, goalLinePieces, goalLinePoint } from './fm-pieces';

function exampleView() {
  const doc = createExampleDocument();
  const store = createPitchStore({ doc, ui: { mode: 'fm' } });
  return { doc, viz: selectFmVisualization(store.getState()) };
}

describe('fmWantedPieces', () => {
  it('is empty until a zone is picked', () => {
    const doc = { ...createExampleDocument(), scenario: null };
    expect(fmWantedPieces(doc, null).size).toBe(0);
    expect(fmWantedPieces(createInitialDocument(), null).size).toBe(0);
  });

  it('places every piece at frame 0 once a zone is set', () => {
    const { doc, viz } = exampleView();
    const wanted = fmWantedPieces(doc, viz);
    expect(wanted.size).toBe(22);
    const keeper = doc.players.find((player) => player.team === 'mine' && player.isKeeper)!;
    expect(wanted.get(keeper.id)).toEqual(viz!.frames[0].positions[`mine:${keeper.slot}`]);
  });
});

describe('goalLinePoint', () => {
  it('puts the attacking team on the bottom line and the defending team on the top line', () => {
    expect(goalLinePoint({ x: 30 }, 'mine', 'mine')).toEqual({ x: 30, y: PITCH_H });
    expect(goalLinePoint({ x: 30 }, 'opponent', 'mine')).toEqual({ x: 30, y: 0 });
    expect(goalLinePoint({ x: 30 }, 'mine', 'opponent')).toEqual({ x: 30, y: 0 });
  });
});

describe('goalLinePieces', () => {
  it('moves each piece to its own goal line and keeps its lane', () => {
    const { doc, viz } = exampleView();
    const wanted = fmWantedPieces(doc, viz);
    const lines = goalLinePieces(wanted, doc);
    doc.players.forEach((player) => {
      expect(lines.get(player.id)).toEqual({
        x: wanted.get(player.id)!.x,
        y: player.team === doc.attacker ? PITCH_H : 0,
      });
    });
  });
});
