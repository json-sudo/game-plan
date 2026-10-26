import { ATTACHMENT_OFFSET } from '../../engine';
import type { PieceScale } from './piece-scale';

const PLAYER_UNITS = 4.4;
const BALL_UNITS = 2.1;
const STROKE_UNITS = 0.15;
const DESKTOP_CAP_PX = 34;

export interface FmGlyphUnits {
  playerDiameter: number;
  ballDiameter: number;
  stroke: number;
  offset: number;
}

function capFactor(ppu: number): number {
  return Math.min(1, DESKTOP_CAP_PX / (PLAYER_UNITS * ppu));
}

export function fmGlyphUnits(ppu: number): FmGlyphUnits {
  const factor = capFactor(ppu);
  return {
    playerDiameter: PLAYER_UNITS * factor,
    ballDiameter: BALL_UNITS * factor,
    stroke: STROKE_UNITS * factor,
    offset: ATTACHMENT_OFFSET * factor,
  };
}

export function fmPieceScale(ppu: number, hitPx: number): PieceScale {
  const units = fmGlyphUnits(ppu);
  const tokenPx = units.playerDiameter * ppu;
  return {
    ppu,
    tokenPx,
    hitPx,
    ballRatio: BALL_UNITS / PLAYER_UNITS,
    strokePx: units.stroke * ppu,
    textScale: tokenPx / DESKTOP_CAP_PX,
  };
}
