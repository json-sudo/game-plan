import { describe, expect, it } from 'vitest';
import { MARKING_BOX_EDGES, ZONE_GRID } from './zones';

describe('MARKING_BOX_EDGES', () => {
  it('derives the penalty and six-yard box edges from the lane edges', () => {
    const [outerLeft, innerLeft, innerRight, outerRight] = ZONE_GRID.laneEdges;
    expect(MARKING_BOX_EDGES.penalty).toEqual({ x0: outerLeft, x1: outerRight });
    expect(MARKING_BOX_EDGES.sixYard).toEqual({ x0: innerLeft, x1: innerRight });
  });
});
