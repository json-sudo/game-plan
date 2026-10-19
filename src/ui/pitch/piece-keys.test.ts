import { describe, expect, it } from 'vitest';
import { PITCH_H, PITCH_W } from '../../engine';
import { pieceKeyStep } from './piece-keys';

const centre = { x: PITCH_W / 2, y: PITCH_H / 2 };

describe('pieceKeyStep', () => {
  it('moves a piece one pitch unit per arrow key', () => {
    expect(pieceKeyStep(centre, 'ArrowRight', false)).toEqual({ x: centre.x + 1, y: centre.y });
    expect(pieceKeyStep(centre, 'ArrowLeft', false)).toEqual({ x: centre.x - 1, y: centre.y });
    expect(pieceKeyStep(centre, 'ArrowUp', false)).toEqual({ x: centre.x, y: centre.y - 1 });
    expect(pieceKeyStep(centre, 'ArrowDown', false)).toEqual({ x: centre.x, y: centre.y + 1 });
  });

  it('moves five units with shift', () => {
    expect(pieceKeyStep(centre, 'ArrowRight', true)).toEqual({ x: centre.x + 5, y: centre.y });
  });

  it('clamps the piece to the pitch', () => {
    expect(pieceKeyStep({ x: 0, y: 0 }, 'ArrowLeft', true)).toEqual({ x: 0, y: 0 });
    expect(pieceKeyStep({ x: PITCH_W, y: PITCH_H }, 'ArrowDown', false)).toEqual({
      x: PITCH_W,
      y: PITCH_H,
    });
  });

  it('returns null for keys that do not move a piece', () => {
    expect(pieceKeyStep(centre, 'a', false)).toBeNull();
  });
});
