export interface PieceScale {
  ppu: number;
  tokenPx: number;
  hitPx: number;
}

// A mid-size desktop board, used where no measured board scale is passed (galleries, isolated pieces).
export const DEFAULT_PIECE_SCALE: PieceScale = { ppu: 8, tokenPx: 30, hitPx: 40 };

export interface PieceUnits {
  radius: number;
  hitRadius: number;
  haloRadius: number;
  haloWidth: number;
  bodyStroke: number;
  roleFont: number;
  roleGap: number;
  nameFont: number;
  nameRise: number;
  nameGlyphWidth: number;
  namePlateHeight: number;
  arrowRing: number;
  arrowStart: number;
  ballRadius: number;
  labelFont: (label: string) => number;
}

const BALL_SCALE = 0.72;
const HALO_GAP_PX = 3;
const HALO_WIDTH_PX = 2.5;
const RING_PX = 2;
const ARROW_START_PX = 4;
const ROLE_FONT_PX = 11.5;
const ROLE_GAP_PX = 3;
const NAME_FONT_PX = 11;
const NAME_RISE_PX = 4;
const NAME_PLATE_HEIGHT_PX = 17;
const NAME_GLYPH_WIDTH_PX = 6;
const LABEL_FONT_TWO_PX = 12;
const LABEL_FONT_LONG_PX = 11;

export function pieceUnits({ ppu, tokenPx, hitPx }: PieceScale): PieceUnits {
  const px = (value: number) => value / ppu;
  const radius = px(tokenPx / 2);
  return {
    radius,
    hitRadius: px(hitPx / 2),
    haloRadius: radius + px(HALO_GAP_PX),
    haloWidth: px(HALO_WIDTH_PX),
    bodyStroke: px(RING_PX),
    roleFont: px(ROLE_FONT_PX),
    roleGap: px(ROLE_GAP_PX),
    nameFont: px(NAME_FONT_PX),
    nameRise: px(NAME_RISE_PX),
    nameGlyphWidth: px(NAME_GLYPH_WIDTH_PX),
    namePlateHeight: px(NAME_PLATE_HEIGHT_PX),
    arrowRing: radius + px(RING_PX),
    arrowStart: radius + px(ARROW_START_PX),
    ballRadius: px((tokenPx / 2) * BALL_SCALE),
    labelFont: (label) => px(label.length === 2 ? LABEL_FONT_TWO_PX : LABEL_FONT_LONG_PX),
  };
}
