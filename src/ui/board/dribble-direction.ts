import type { Side } from '../../data/types';
import type { DribbleDirection as EngineDirection } from '../../engine';
import { DRIBBLE_LABELS } from '../copy';
import type { DribbleDirection as ArrowDirection } from '../pitch/DribbleControl';

const OPPOSITE: Record<ArrowDirection, ArrowDirection> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
};

const ATTACKER_DIRECTIONS: Record<ArrowDirection, EngineDirection> = {
  up: 'forward',
  right: 'right',
  down: 'back',
  left: 'left',
};

export function engineDirection(arrow: ArrowDirection, attacker: Side): EngineDirection {
  return ATTACKER_DIRECTIONS[attacker === 'mine' ? arrow : OPPOSITE[arrow]];
}

export function dribbleLabels(attacker: Side): Record<ArrowDirection, string> {
  if (attacker === 'mine') return DRIBBLE_LABELS;
  return {
    up: DRIBBLE_LABELS[OPPOSITE.up],
    right: DRIBBLE_LABELS[OPPOSITE.right],
    down: DRIBBLE_LABELS[OPPOSITE.down],
    left: DRIBBLE_LABELS[OPPOSITE.left],
  };
}
