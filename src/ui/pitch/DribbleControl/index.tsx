import type { KeyboardEvent, ReactNode } from 'react';
import { DRIBBLE_LABELS } from '../../copy';
import styles from './dribble-control.module.scss';

export type DribbleDirection = 'up' | 'right' | 'down' | 'left';

export interface DribbleControlProps {
  x: number;
  y: number;
  onDribble?: (direction: DribbleDirection) => void;
  children?: ReactNode;
}

export const DRIBBLE_DISTANCE = 5.4;
const BUTTON_RADIUS = 2.1;
const GLYPH = 'M0 -0.9 L0.8 0.6 L-0.8 0.6 Z';
const ROTATIONS: Record<DribbleDirection, number> = { up: 0, right: 90, down: 180, left: 270 };

const OFFSETS: Record<DribbleDirection, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -DRIBBLE_DISTANCE },
  right: { dx: DRIBBLE_DISTANCE, dy: 0 },
  down: { dx: 0, dy: DRIBBLE_DISTANCE },
  left: { dx: -DRIBBLE_DISTANCE, dy: 0 },
};

const KEY_DIRECTIONS: Record<string, DribbleDirection> = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
};

const DIRECTIONS = Object.keys(OFFSETS) as DribbleDirection[];

export function DribbleControl({ x, y, onDribble, children }: DribbleControlProps) {
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    onDribble?.(direction);
  };

  return (
    <g className={styles.control} onKeyDown={onKeyDown}>
      {children}
      {DIRECTIONS.map((direction) => {
        const { dx, dy } = OFFSETS[direction];
        return (
          <g
            key={direction}
            className={styles.button}
            role="button"
            tabIndex={0}
            aria-label={DRIBBLE_LABELS[direction]}
            transform={`translate(${x + dx} ${y + dy})`}
            onClick={() => onDribble?.(direction)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              onDribble?.(direction);
            }}
          >
            <circle className={styles.disc} r={BUTTON_RADIUS} />
            <path
              className={styles.glyph}
              d={GLYPH}
              transform={`rotate(${ROTATIONS[direction]})`}
            />
          </g>
        );
      })}
    </g>
  );
}
