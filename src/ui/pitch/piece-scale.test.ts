import { describe, expect, it } from 'vitest';
import { pieceUnits, type PieceScale } from './piece-scale';

const desktop: PieceScale = { ppu: 8, tokenPx: 32, hitPx: 40 };

describe('pieceUnits', () => {
  it('converts the token radius from pixels into pitch units', () => {
    expect(pieceUnits(desktop).radius).toBe(2);
  });

  it('keeps the hit area at the given pixel size', () => {
    expect(pieceUnits(desktop).hitRadius).toBe(2.5);
  });

  it('sizes the selected halo at 3px outside the ring with a 2.5px stroke', () => {
    const units = pieceUnits(desktop);
    expect(units.haloRadius).toBeCloseTo(2 + 3 / 8);
    expect(units.haloWidth).toBeCloseTo(2.5 / 8);
  });

  it('uses 12px position text for two characters and 11px for three', () => {
    expect(pieceUnits(desktop).labelFont('GK')).toBeCloseTo(12 / 8);
    expect(pieceUnits(desktop).labelFont('AML')).toBeCloseTo(11 / 8);
  });

  it('keeps role and custom name text at 11.5px and 11px', () => {
    const units = pieceUnits(desktop);
    expect(units.roleFont).toBeCloseTo(11.5 / 8);
    expect(units.nameFont).toBeCloseTo(11 / 8);
  });

  it('sizes the custom name plate from pixels', () => {
    const units = pieceUnits(desktop);
    expect(units.nameRise).toBeCloseTo(4 / 8);
    expect(units.namePlateHeight).toBeCloseTo(17 / 8);
    expect(units.nameGlyphWidth).toBeCloseTo(6 / 8);
  });

  it('sizes the arrow ring at 2px outside the token and starts the arrow 4px outside it', () => {
    const units = pieceUnits(desktop);
    expect(units.arrowRing).toBeCloseTo(2 + 2 / 8);
    expect(units.arrowStart).toBeCloseTo(2 + 4 / 8);
  });

  it('sizes the ball at 72% of a token', () => {
    expect(pieceUnits(desktop).ballRadius).toBeCloseTo(((32 / 2) * 0.72) / 8);
  });
});
