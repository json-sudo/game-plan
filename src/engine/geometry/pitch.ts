export const PITCH_W = 76.19;
export const PITCH_H = 100;

// Piece token radius is 2.2, ball image radius is 1.2; -3 puts the ball's center
// far enough above the piece's that it sits on top with a ~0.4-unit overlap.
export const BALL_ATOP_OFFSET_Y = -3;

export function ballAtopPosition(piecePosition: { x: number; y: number }): {
  x: number;
  y: number;
} {
  return { x: piecePosition.x, y: piecePosition.y + BALL_ATOP_OFFSET_Y };
}

export function clampToPitch(
  point: { x: number; y: number },
  margin = 0,
): { x: number; y: number } {
  return {
    x: Math.min(PITCH_W - margin, Math.max(margin, point.x)),
    y: Math.min(PITCH_H - margin, Math.max(margin, point.y)),
  };
}
