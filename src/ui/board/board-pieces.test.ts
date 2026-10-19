import { describe, expect, it } from 'vitest';
import { ballAtopPosition } from '../../engine';
import { applyAction } from '../../state/actions';
import { createInitialDocument } from '../../state/document';
import { createExampleDocument, EXAMPLE_CARRIER } from '../../state/example';
import { selectPhasePositions } from '../../state/selectors';
import { boardPieceTargets } from './board-pieces';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

const doc = createExampleDocument();
const positions = selectPhasePositions(doc).shape;

describe('boardPieceTargets', () => {
  it('draws the ball above the carrier in FM mode', () => {
    const { ball, pieces } = boardPieceTargets({
      doc,
      positions,
      fm: true,
      action: null,
      ballDrag: null,
    });
    expect(pieces).toBe(positions);
    expect(ball).toEqual(ballAtopPosition(positions.get(EXAMPLE_CARRIER)!));
  });

  it('keeps the ball on its own spot in FM mode while nobody has been picked', () => {
    const noCarrier = applyAction(doc, { type: 'tapZone', zone: 'C-D' });
    const { ball } = boardPieceTargets({
      doc: noCarrier,
      positions: selectPhasePositions(noCarrier).shape,
      fm: true,
      action: null,
      ballDrag: null,
    });
    expect(ball).toEqual(noCarrier.ball);
  });

  it('never attaches the ball to a player in Open pitch, even with a stored scenario', () => {
    const { ball } = boardPieceTargets({
      doc,
      positions,
      fm: false,
      action: null,
      ballDrag: null,
    });
    expect(ball).toEqual(doc.ball);
  });

  it('follows the dragged ball point directly', () => {
    const { ball } = boardPieceTargets({
      doc: createInitialDocument(),
      positions: new Map(),
      fm: false,
      action: null,
      ballDrag: { x: 12, y: 34 },
    });
    expect(ball).toEqual({ x: 12, y: 34 });
  });

  it('sends the ball to the receiver during a pass while every piece stays put', () => {
    const receiver = exampleSlotId('mine', 'DR');
    const { ball, pieces } = boardPieceTargets({
      doc,
      positions,
      fm: true,
      action: { type: 'pass', receiverId: receiver },
      ballDrag: null,
    });
    expect(ball).toEqual(ballAtopPosition(positions.get(receiver)!));
    expect(pieces).toBe(positions);
  });

  it('moves the carrier and the ball together during a dribble, leaving the others', () => {
    const dribbled = applyAction(doc, { type: 'dribble', direction: 'forward' });
    const { ball, pieces } = boardPieceTargets({
      doc,
      positions,
      fm: true,
      action: { type: 'dribble', direction: 'forward' },
      ballDrag: null,
    });
    expect(pieces.get(EXAMPLE_CARRIER)).toEqual(dribbled.ball);
    expect(ball).toEqual(ballAtopPosition(dribbled.ball));
    expect(pieces.get(exampleSlotId('mine', 'ST'))).toEqual(
      positions.get(exampleSlotId('mine', 'ST')),
    );
    expect(positions.get(EXAMPLE_CARRIER)).not.toEqual(dribbled.ball);
  });

  it('ignores an action the document would refuse', () => {
    const { ball, pieces } = boardPieceTargets({
      doc,
      positions,
      fm: true,
      action: { type: 'pass', receiverId: EXAMPLE_CARRIER },
      ballDrag: null,
    });
    expect(pieces).toBe(positions);
    expect(ball).toEqual(ballAtopPosition(positions.get(EXAMPLE_CARRIER)!));
  });
});
