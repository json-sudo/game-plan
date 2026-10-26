import { describe, expect, it } from 'vitest';
import type { Point } from '../../data/types';
import { ATTACHMENT_OFFSET, PITCH_W } from '../../engine';
import referenceJson from '../../engine/fm/fixtures/reference-openings.json';
import { fmGlyphUnits, fmPieceScale } from './fm-glyph';
import { pieceUnits } from './piece-scale';

const MIN_BODY_GAP = 0.25;
const SQUARE_SCALE = 0.9;
const SQUARE_CORNER_SCALE = 0.42;
const HIT_PX = 40;

const ppuFor = (pitchW: number) => pitchW / PITCH_W;

interface Body {
  id: string;
  point: Point;
}

interface Reference {
  openings: Record<string, { positions: Record<string, Point>; starter: string; ball: Point }>;
}

const reference = referenceJson as Reference;

function circleGap(a: Point, ra: number, b: Point, rb: number): number {
  return Math.hypot(a.x - b.x, a.y - b.y) - ra - rb;
}

function squareGap(circle: Point, r: number, square: Point, half: number, corner: number): number {
  const inner = half - corner;
  const dx = Math.max(Math.abs(circle.x - square.x) - inner, 0);
  const dy = Math.max(Math.abs(circle.y - square.y) - inner, 0);
  return Math.hypot(dx, dy) - corner - r;
}

function squareSquareGap(a: Point, b: Point, half: number, corner: number): number {
  const inner = half - corner;
  const dx = Math.max(Math.abs(a.x - b.x) - 2 * inner, 0);
  const dy = Math.max(Math.abs(a.y - b.y) - 2 * inner, 0);
  return Math.hypot(dx, dy) - 2 * corner;
}

function bodies(positions: Record<string, Point>): Body[] {
  return Object.entries(positions).map(([id, point]) => ({ id, point }));
}

describe('fmPieceScale', () => {
  it('draws players about 20.7 px at a 358 px pitch and 16.6 px at a 288 px pitch', () => {
    expect(fmPieceScale(ppuFor(358), HIT_PX).tokenPx).toBeCloseTo(20.7, 1);
    expect(fmPieceScale(ppuFor(288), HIT_PX).tokenPx).toBeCloseTo(16.6, 1);
  });

  it('caps the player glyph at 34 px on large pitches', () => {
    expect(fmPieceScale(ppuFor(900), HIT_PX).tokenPx).toBe(34);
  });

  it('scales ball, stroke and attachment offset from the same factor', () => {
    const small = fmGlyphUnits(ppuFor(288));
    const large = fmGlyphUnits(ppuFor(358));
    expect(small.ballDiameter / small.playerDiameter).toBeCloseTo(2.1 / 4.4);
    expect(small.stroke / small.playerDiameter).toBeCloseTo(0.15 / 4.4);
    expect(small.offset / small.playerDiameter).toBeCloseTo(ATTACHMENT_OFFSET / 4.4);
    expect(large.playerDiameter).toBeCloseTo(4.4);
    expect(large.offset).toBeCloseTo(ATTACHMENT_OFFSET);
  });

  it('renders the ball, stroke and numbers in proportion to the token', () => {
    const scale = fmPieceScale(ppuFor(358), HIT_PX);
    const units = pieceUnits(scale);
    expect(units.radius * 2).toBeCloseTo(4.4);
    expect(units.ballRadius * 2).toBeCloseTo(2.1);
    expect(units.bodyStroke).toBeCloseTo(0.15);
    const smaller = pieceUnits(fmPieceScale(ppuFor(288), HIT_PX));
    expect(smaller.labelFont('DM') * ppuFor(288)).toBeLessThan(units.labelFont('DM') * ppuFor(358));
  });

  it('leaves the Open pitch sizing untouched', () => {
    const open = pieceUnits({ ppu: 4.7, tokenPx: 30, hitPx: 44 });
    expect(open.ballRadius).toBeCloseTo((15 * 0.72) / 4.7);
    expect(open.bodyStroke).toBeCloseTo(2 / 4.7);
    expect(open.labelFont('DM')).toBeCloseTo(12 / 4.7);
  });
});

describe('FM glyph clearance on the reference openings', () => {
  const units = fmGlyphUnits(ppuFor(288));
  const outline = units.stroke / 2;
  const circleR = units.playerDiameter / 2 + outline;
  const half = (units.playerDiameter / 2) * SQUARE_SCALE + outline;
  const corner = (units.playerDiameter / 2) * SQUARE_CORNER_SCALE + outline;
  const ballR = units.ballDiameter / 2 + outline;

  const gapBetween = (a: Body, b: Body): number => {
    const aSquare = a.id.startsWith('opponent');
    const bSquare = b.id.startsWith('opponent');
    if (aSquare && bSquare) return squareSquareGap(a.point, b.point, half, corner);
    if (aSquare) return squareGap(b.point, circleR, a.point, half, corner);
    if (bSquare) return squareGap(a.point, circleR, b.point, half, corner);
    return circleGap(a.point, circleR, b.point, circleR);
  };

  describe.each(Object.entries(reference.openings))('%s', (_, opening) => {
    const all = bodies(opening.positions);

    it('keeps at least 0.25 units between body silhouettes', () => {
      const gaps = all.flatMap((a, index) => all.slice(index + 1).map((b) => gapBetween(a, b)));
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(MIN_BODY_GAP);
    });

    it('clears every unrelated body with the ball', () => {
      const gaps = all
        .filter((body) => body.id !== opening.starter)
        .map((body) =>
          body.id.startsWith('opponent')
            ? squareGap(opening.ball, ballR, body.point, half, corner)
            : circleGap(opening.ball, ballR, body.point, circleR),
        );
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(MIN_BODY_GAP);
    });
  });
});
