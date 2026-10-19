import { describe, expect, it } from 'vitest';
import { DRIBBLE_LABELS } from '../copy';
import { dribbleLabels, engineDirection } from './dribble-direction';

describe('engineDirection', () => {
  it('reads the arrows as pitch directions when my team attacks up the pitch', () => {
    expect(engineDirection('up', 'mine')).toBe('forward');
    expect(engineDirection('down', 'mine')).toBe('back');
    expect(engineDirection('left', 'mine')).toBe('left');
    expect(engineDirection('right', 'mine')).toBe('right');
  });

  it('flips them for the opponent, who attacks the other way', () => {
    expect(engineDirection('up', 'opponent')).toBe('back');
    expect(engineDirection('down', 'opponent')).toBe('forward');
    expect(engineDirection('left', 'opponent')).toBe('right');
    expect(engineDirection('right', 'opponent')).toBe('left');
  });
});

describe('dribbleLabels', () => {
  it('names the arrows by what they do for the attacking team', () => {
    expect(dribbleLabels('mine')).toEqual(DRIBBLE_LABELS);
    expect(dribbleLabels('opponent')).toEqual({
      up: DRIBBLE_LABELS.down,
      right: DRIBBLE_LABELS.left,
      down: DRIBBLE_LABELS.up,
      left: DRIBBLE_LABELS.right,
    });
  });
});
