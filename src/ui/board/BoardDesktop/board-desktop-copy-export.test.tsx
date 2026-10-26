import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Point } from '../../../data/types';
import { playersOf } from '../../../state/document';
import { createPitchStore } from '../../../state/store';
import { BoardDesktop } from '.';

vi.mock('../../export/png', () => ({
  renderPng: vi.fn<() => Promise<Blob>>().mockReturnValue(new Promise(() => undefined)),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const FRAME_MS = 16;
const MID_PASS_MS = 2237;

function fmStore() {
  const store = createPitchStore({ ui: { mode: 'fm' } });
  const { dispatch, setMode } = store.getState();
  dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
  dispatch({ type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' });
  dispatch({ type: 'fillDefaultRoles' });
  setMode('openPitch');
  dispatch({ type: 'placeBall', point: { x: 55, y: 12 } });
  dispatch({ type: 'setSquadSize', team: 'mine', size: 20 });
  setMode('fm');
  dispatch({ type: 'tapZone', zone: 'C-D' });
  return store;
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function centres(root: Element): Point[] {
  return Array.from(root.querySelectorAll<SVGGElement>('g[role="img"][data-team]')).map((token) => {
    const match = /translate\(([-\d.e]+)px, ([-\d.e]+)px\)/.exec(token.style.transform)!;
    return { x: Number(match[1]), y: Number(match[2]) };
  });
}

const pitchCentres = () => centres(document.querySelector('[data-column="pitch"]')!);

function exportedCentres() {
  const dialog = screen.getByRole('dialog', { name: 'Export PNG' });
  return centres(dialog);
}

function boardAtMidPass() {
  const store = fmStore();
  render(<BoardDesktop store={store} />);
  advance(MID_PASS_MS + FRAME_MS / 2);
  return store;
}

describe('copy, export and share at a fractional time', () => {
  it('exports exactly the rendered centres and freezes them while playback continues', () => {
    boardAtMidPass();
    const rendered = pitchCentres();
    fireEvent.click(screen.getByRole('button', { name: 'Export PNG' }));
    const exported = exportedCentres();
    expect(exported).toHaveLength(rendered.length);
    exported.forEach((point, index) => {
      expect(point.x).toBeCloseTo(rendered[index].x, 6);
      expect(point.y).toBeCloseTo(rendered[index].y, 6);
    });
    advance(400);
    expect(pitchCentres()).not.toEqual(rendered);
    expect(exportedCentres()).toEqual(exported);
  });

  it('changes no state and never restarts playback when exporting', () => {
    const store = boardAtMidPass();
    const before = store.getState();
    fireEvent.click(screen.getByRole('button', { name: 'Export PNG' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const after = store.getState();
    expect(after.tactic).toBe(before.tactic);
    expect(after.history).toBe(before.history);
    expect(after.ui.restartCount).toBe(before.ui.restartCount);
    expect(after.ui.theme).toBe(before.ui.theme);
  });

  it('copies the live centres on confirmation and keeps the ball, bench and FM layout', () => {
    const store = boardAtMidPass();
    const fmBefore = store.getState().tactic.fm;
    fireEvent.click(screen.getByRole('button', { name: 'Copy FM positions' }));
    advance(200);
    const rendered = pitchCentres();
    fireEvent.click(screen.getByRole('button', { name: 'Replace pieces' }));
    const { tactic, ui } = store.getState();
    const placed = tactic.fm.players
      .map((player) => tactic.openPitch.players.find((candidate) => candidate.id === player.id)!)
      .filter((player) => player.base);
    expect(placed).toHaveLength(rendered.length);
    placed.forEach((player, index) => {
      expect(player.base!.x).toBeCloseTo(rendered[index].x, 6);
      expect(player.base!.y).toBeCloseTo(rendered[index].y, 6);
    });
    expect(tactic.openPitch.ball).toEqual({ x: 55, y: 12 });
    expect(playersOf(tactic.openPitch, 'mine').filter((player) => !player.base)).toHaveLength(9);
    expect(tactic.fm).toBe(fmBefore);
    expect(ui.restartCount).toBe(0);
    expect(within(document.body).queryByRole('dialog')).toBeNull();
  });

  it('does not copy when the confirmation is cancelled', () => {
    const store = boardAtMidPass();
    const before = store.getState().tactic;
    fireEvent.click(screen.getByRole('button', { name: 'Copy FM positions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store.getState().tactic).toBe(before);
  });

  it('disables copy until a zone is set', () => {
    const store = createPitchStore({ ui: { mode: 'fm' } });
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('button', { name: 'Copy FM positions' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
