import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MARKING_BOX_EDGES } from '../../../engine';
import { Pitch } from '.';

const BOX_MAX_DEPTH = 20;

describe('Pitch markings', () => {
  it('draws the penalty and six-yard boxes on the zone lane edges', () => {
    const { container } = render(<Pitch label="Pitch" />);
    const spans = [...container.querySelectorAll('g rect')]
      .filter((rect) => Number(rect.getAttribute('height')) < BOX_MAX_DEPTH)
      .map((rect) => {
        const x0 = Number(rect.getAttribute('x'));
        return { x0, x1: x0 + Number(rect.getAttribute('width')) };
      });
    const matching = (edges: { x0: number; x1: number }) =>
      spans.filter(
        (span) => Math.abs(span.x0 - edges.x0) < 1e-9 && Math.abs(span.x1 - edges.x1) < 1e-9,
      );
    expect(matching(MARKING_BOX_EDGES.penalty)).toHaveLength(2);
    expect(matching(MARKING_BOX_EDGES.sixYard)).toHaveLength(2);
  });
});
