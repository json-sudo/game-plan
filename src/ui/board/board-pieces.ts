import type { Point } from '../../data/types';
import { ballAtopPosition } from '../../engine';
import { applyAction } from '../../state/actions';
import type { PitchDocument } from '../../state/document';
import type { BallAction } from '../../state/store';

export interface BoardPieceInput {
  doc: PitchDocument;
  positions: ReadonlyMap<string, Point>;
  fm: boolean;
  action: BallAction | null;
  ballDrag: Point | null;
}

export interface BoardPieces {
  pieces: ReadonlyMap<string, Point>;
  ball: Point;
}

function carrierBall(
  doc: PitchDocument,
  positions: ReadonlyMap<string, Point>,
  fm: boolean,
): Point {
  const carrierId = doc.scenario?.carrierId;
  const carrier = fm ? doc.players.find((player) => player.id === carrierId) : undefined;
  const point = carrier ? positions.get(carrier.id) : undefined;
  return carrier && carrier.team === doc.attacker && point ? ballAtopPosition(point) : doc.ball;
}

function actionTargets(
  { doc, positions }: BoardPieceInput,
  action: BallAction,
): BoardPieces | null {
  const carrierId = doc.scenario?.carrierId;
  if (!carrierId) return null;
  if (action.type === 'pass') {
    const target = positions.get(action.receiverId);
    const accepted = applyAction(doc, { type: 'pass', receiverId: action.receiverId });
    return target && accepted !== doc
      ? { pieces: positions, ball: ballAtopPosition(target) }
      : null;
  }
  const dribbled = applyAction(doc, { type: 'dribble', direction: action.direction });
  if (dribbled === doc) return null;
  return {
    pieces: new Map(positions).set(carrierId, dribbled.ball),
    ball: ballAtopPosition(dribbled.ball),
  };
}

export function boardPieceTargets(input: BoardPieceInput): BoardPieces {
  const { doc, positions, fm, action, ballDrag } = input;
  const acting = fm && action ? actionTargets(input, action) : null;
  if (acting) return acting;
  return { pieces: positions, ball: ballDrag ?? carrierBall(doc, positions, fm) };
}
