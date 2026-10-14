import { describe, expect, it } from 'vitest';
import { PICKER_SIZE, anchorRolePicker } from './anchor-role-picker';

const VIEWPORT = { width: 1440, height: 900 };
const COLUMN = 300;
const TOP_BAR = 56;
const TOKEN = 48;
const PITCH = {
  left: COLUMN,
  top: TOP_BAR,
  width: VIEWPORT.width - COLUMN * 2,
  height: VIEWPORT.height - TOP_BAR,
};

function tokenOn(edge: 'left' | 'right' | 'top' | 'bottom') {
  const midX = PITCH.left + (PITCH.width - TOKEN) / 2;
  const midY = PITCH.top + (PITCH.height - TOKEN) / 2;
  if (edge === 'left') return { left: PITCH.left, top: midY, width: TOKEN, height: TOKEN };
  if (edge === 'right') {
    return { left: PITCH.left + PITCH.width - TOKEN, top: midY, width: TOKEN, height: TOKEN };
  }
  if (edge === 'top') return { left: midX, top: PITCH.top, width: TOKEN, height: TOKEN };
  return { left: midX, top: PITCH.top + PITCH.height - TOKEN, width: TOKEN, height: TOKEN };
}

describe('anchorRolePicker', () => {
  it('stays inside the 1440 by 900 viewport for a token at each pitch edge', () => {
    const placed = (['left', 'right', 'top', 'bottom'] as const).map((edge) => {
      const place = anchorRolePicker(tokenOn(edge), VIEWPORT, PICKER_SIZE);
      return {
        edge,
        inside:
          place.left >= 0 &&
          place.top >= 0 &&
          place.left + PICKER_SIZE.width <= VIEWPORT.width &&
          place.top + PICKER_SIZE.height <= VIEWPORT.height,
      };
    });
    expect(placed).toEqual([
      { edge: 'left', inside: true },
      { edge: 'right', inside: true },
      { edge: 'top', inside: true },
      { edge: 'bottom', inside: true },
    ]);
  });
});
