import { describe, expect, it } from 'vitest';
import { PITCH_H, PITCH_W } from '../../engine';
import { boardMetrics } from './board-metrics';

describe('boardMetrics', () => {
  it('sizes the pitch from the viewport height and stays vertical', () => {
    const metrics = boardMetrics(1920, 960);
    expect(metrics.pitchH).toBe(875);
    expect(metrics.pitchW / metrics.pitchH).toBeCloseTo(PITCH_W / PITCH_H, 2);
    expect(metrics.pitchW).toBe(Math.floor((960 - 84) * (PITCH_W / PITCH_H)));
  });

  it('keeps the pitch at least 420px tall on short viewports and marks the page as scrolling below 504px', () => {
    expect(boardMetrics(1366, 560).pitchH).toBe(475);
    expect(boardMetrics(1366, 480).pageScrolls).toBe(true);
    expect(boardMetrics(1366, 560).pageScrolls).toBe(false);
  });

  it('uses three columns when the viewport fits both side columns beside the pitch', () => {
    const metrics = boardMetrics(1366, 680);
    expect(metrics.layout).toBe('three');
    expect(metrics.pitchW).toBe(454);
    expect(metrics.pitchH).toBe(596);
  });

  it('switches to two columns when only one side column fits', () => {
    const metrics = boardMetrics(1024, 700);
    expect(metrics.layout).toBe('two');
    expect(metrics.pitchW).toBe(469);
    expect(metrics.pitchH).toBe(616);
  });

  it('falls back to the phone layout at 600px wide or less', () => {
    expect(boardMetrics(390, 844).layout).toBe('phone');
    expect(boardMetrics(600, 900).layout).toBe('phone');
    expect(boardMetrics(390, 844).pitchW).toBe(358);
  });

  it('falls back to the phone layout when two columns would squeeze the pitch below 360px', () => {
    expect(boardMetrics(700, 900).layout).toBe('phone');
  });

  it('sizes tokens in pixels, clamped between 26 and 34 on desktop and fixed at 30 on phones', () => {
    expect(boardMetrics(1366, 680).tokenPx).toBe(26);
    expect(boardMetrics(1536, 864).tokenPx).toBe(31);
    expect(boardMetrics(2560, 1300).tokenPx).toBe(34);
    expect(boardMetrics(390, 844).tokenPx).toBe(30);
  });

  it('shows full role labels only when the pitch is 760px tall or more', () => {
    expect(boardMetrics(1536, 864).labels).toBe('full');
    expect(boardMetrics(1366, 680).labels).toBe('compact');
    expect(boardMetrics(390, 844).labels).toBe('compact');
  });

  it('reports ppu as screen pixels per pitch unit', () => {
    const metrics = boardMetrics(1920, 960);
    expect(metrics.ppu * PITCH_W).toBeCloseTo(metrics.pitchW, 0);
  });
});
