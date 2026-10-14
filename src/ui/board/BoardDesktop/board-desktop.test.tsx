import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RESET_DISABLED_REASON, UNDO_DISABLED_REASON } from '../../copy';
import { createInitialDocument, playersOf } from '../../../state/document';
import { createPitchStore } from '../../../state/store';
import { BoardDesktop } from '.';

function stubSvg(svg: Element) {
  const scale = 2;
  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({ a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 }),
  });
  svg.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 76.19 * scale,
      bottom: 100 * scale,
      width: 76.19 * scale,
      height: 100 * scale,
    }) as DOMRect;
}

describe('BoardDesktop', () => {
  it('renders the document from the store and shows a later edit', () => {
    const store = createPitchStore({ doc: createInitialDocument() });
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('group', { name: 'My team' })).toBeInTheDocument();
    act(() => {
      store.getState().dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    });
    expect(screen.getByRole('group', { name: 'Reds' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'My team' })).not.toBeInTheDocument();
  });

  it('disables undo until a committed edit, then undo reverts it', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createInitialDocument() });
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAccessibleDescription(
      UNDO_DISABLED_REASON,
    );
    act(() => {
      store.getState().dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('group', { name: 'My team' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAccessibleDescription(
      UNDO_DISABLED_REASON,
    );
  });

  it('enables reset only after a formation is applied, and undo restores the edit', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createInitialDocument() });
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveAccessibleDescription(
      RESET_DISABLED_REASON,
    );
    act(() => {
      store.getState().dispatch({
        type: 'applyFormation',
        team: 'mine',
        formationId: '4_3_3_dm_wide',
      });
    });
    const applied = store.getState().doc.players.find((player) => player.id === 'mine-ST')!.base;
    act(() => {
      store.getState().dispatch({ type: 'movePlayer', playerId: 'mine-ST', point: { x: 1, y: 1 } });
    });
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(store.getState().doc.players.find((player) => player.id === 'mine-ST')!.base).toEqual(
      applied,
    );
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(store.getState().doc.players.find((player) => player.id === 'mine-ST')!.base).toEqual({
      x: 1,
      y: 1,
    });
  });

  it('switches mode through the store and fills roles when entering FM mode', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createInitialDocument() });
    act(() => {
      store
        .getState()
        .dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    });
    render(<BoardDesktop store={store} />);
    await user.click(screen.getByRole('radio', { name: 'FM mode' }));
    expect(store.getState().ui.mode).toBe('fm');
    expect(
      playersOf(store.getState().doc, 'mine')
        .filter((player) => player.base)
        .every((player) => player.role !== undefined),
    ).toBe(true);
    await user.click(screen.getByRole('radio', { name: 'Open pitch' }));
    expect(store.getState().ui.mode).toBe('openPitch');
  });

  it('commits one move when a pitch drag is released', () => {
    const store = createPitchStore({ doc: createInitialDocument() });
    act(() => {
      store
        .getState()
        .dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    });
    const past = store.getState().history.past.length;
    render(<BoardDesktop store={store} />);
    stubSvg(screen.getByRole('img', { name: 'Pitch' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'ST, my team' }), {
      clientX: 1,
      clientY: 1,
    });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 80 });
    fireEvent.pointerUp(window, { clientX: 60, clientY: 80 });
    expect(store.getState().history.past).toHaveLength(past + 1);
    expect(store.getState().doc.players.find((player) => player.id === 'mine-ST')!.base).toEqual({
      x: 30,
      y: 40,
    });
  });
});
