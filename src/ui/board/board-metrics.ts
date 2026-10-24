import { PITCH_H, PITCH_W } from '../../engine';

export type BoardLayout = 'three' | 'two' | 'phone';
export type LabelMode = 'full' | 'compact';

export interface BoardMetrics {
  layout: BoardLayout;
  pitchW: number;
  pitchH: number;
  ppu: number;
  tokenPx: number;
  labels: LabelMode;
  pageScrolls: boolean;
}

export const BOARD_RULES = {
  chrome: 84,
  column: 300,
  gap: 24,
  margin: 24,
  minPitchH: 420,
  fullLabelsH: 760,
  minTwoColumnPitchW: 360,
  phoneMaxWidth: 600,
  phoneGutter: 16,
  phoneTokenPx: 30,
  tokenRatio: 0.04,
  tokenMinPx: 26,
  tokenMaxPx: 34,
} as const;

const BODY_GAP_PX = 1;

const PITCH_RATIO = PITCH_W / PITCH_H;
const THREE_COLUMN_EXTRA = 2 * BOARD_RULES.column + 2 * BOARD_RULES.gap + 2 * BOARD_RULES.margin;
const TWO_COLUMN_EXTRA = BOARD_RULES.column + BOARD_RULES.gap + 2 * BOARD_RULES.margin;

function layoutFor(viewportW: number, fullWidth: number): { layout: BoardLayout; width: number } {
  if (viewportW <= BOARD_RULES.phoneMaxWidth) return { layout: 'phone', width: fullWidth };
  if (viewportW >= THREE_COLUMN_EXTRA + fullWidth) return { layout: 'three', width: fullWidth };
  const twoWidth = viewportW - TWO_COLUMN_EXTRA;
  if (twoWidth >= BOARD_RULES.minTwoColumnPitchW) {
    return { layout: 'two', width: Math.min(fullWidth, twoWidth) };
  }
  return { layout: 'phone', width: fullWidth };
}

function tokenSizeFor(layout: BoardLayout, pitchH: number): number {
  if (layout === 'phone') return BOARD_RULES.phoneTokenPx;
  const scaled = Math.round(pitchH * BOARD_RULES.tokenRatio);
  return Math.min(BOARD_RULES.tokenMaxPx, Math.max(BOARD_RULES.tokenMinPx, scaled));
}

export function bodyClearance({ tokenPx, ppu }: Pick<BoardMetrics, 'tokenPx' | 'ppu'>): number {
  return (tokenPx + BODY_GAP_PX) / ppu;
}

export function boardMetrics(viewportW: number, viewportH: number): BoardMetrics {
  const availableH = Math.max(BOARD_RULES.minPitchH, viewportH - BOARD_RULES.chrome);
  const fitted = layoutFor(viewportW, availableH * PITCH_RATIO);
  const widthCap = fitted.layout === 'phone' ? viewportW - 2 * BOARD_RULES.phoneGutter : Infinity;
  const pitchW = Math.floor(Math.min(fitted.width, widthCap));
  const exactH = pitchW / PITCH_RATIO;
  const pitchH = Math.round(exactH);
  return {
    layout: fitted.layout,
    pitchW,
    pitchH,
    ppu: pitchW / PITCH_W,
    tokenPx: tokenSizeFor(fitted.layout, exactH),
    labels: fitted.layout !== 'phone' && pitchH >= BOARD_RULES.fullLabelsH ? 'full' : 'compact',
    pageScrolls: viewportH - BOARD_RULES.chrome < BOARD_RULES.minPitchH,
  };
}
