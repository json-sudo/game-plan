import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import { ballAtopPosition } from '../../../engine';
import { createInitialDocument, placedPlayers, playersOf } from '../../../state/document';
import { createExampleDocument, EXAMPLE_FORMATIONS } from '../../../state/example';
import { selectPhasePositions } from '../../../state/selectors';
import { createPitchStore, type PitchStore } from '../../../state/store';
import {
  ARROWS_LABEL,
  RESET_DISABLED_REASON,
  SIDE_COLUMN_LABEL,
  SETUP_COLUMN_LABEL,
  UNDO_DISABLED_REASON,
} from '../../copy';
import { ARROW_RING_RADIUS } from '../../pitch/Arrow';
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

function exampleStore(ui: Partial<PitchStore['ui']> = {}) {
  return createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm', ...ui } });
}

function formationName(id: string) {
  return FM26_DATA.formations.find((formation) => formation.id === id)!.name;
}

function plateText(element: HTMLElement) {
  return (element.textContent ?? '').replaceAll(' ', '');
}

function translation(element: Element) {
  const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(
    (element as HTMLElement).style.transform,
  );
  if (!match) throw new Error(`no translation on ${element.getAttribute('aria-label')}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

function rings(container: HTMLElement) {
  return [...container.querySelectorAll('circle')].filter(
    (circle) => circle.getAttribute('r') === String(ARROW_RING_RADIUS),
  );
}

function movers(store: StoreApi<PitchStore>) {
  const doc = store.getState().doc;
  const phases = selectPhasePositions(doc);
  const carrierId = doc.scenario?.carrierId;
  return placedPlayers(doc).flatMap((player) => {
    if (player.id === carrierId) return [];
    const from = phases.shape.get(player.id);
    const to = phases.final.get(player.id);
    if (!from || !to || (from.x === to.x && from.y === to.y)) return [];
    return [{ id: player.id, to }];
  });
}

describe('desktop board', () => {
  it('renders the example with both formations and the 4-3-3 and 4-2-3-1 labels on the tokens', () => {
    const doc = createExampleDocument();
    const store = exampleStore();
    render(<BoardDesktop store={store} />);
    const mine = formationName(EXAMPLE_FORMATIONS.mine);
    const opponent = formationName(EXAMPLE_FORMATIONS.opponent);
    expect(mine).toContain('4-3-3');
    expect(opponent).toContain('4-2-3-1');
    expect(screen.getByText(mine)).toBeInTheDocument();
    expect(screen.getByText(opponent)).toBeInTheDocument();

    const mineWide = doc.players.find((player) => player.id === 'mine-AMCL')!;
    const oppStriker = doc.players.find((player) => player.id === 'opponent-AMC')!;
    const mineRole = FM26_DATA.roles.find((role) => role.id === mineWide.role)!.name;
    const oppRole = FM26_DATA.roles.find((role) => role.id === oppStriker.role)!.name;
    const mineToken = screen.getByRole('button', { name: `AMCL, ${mineRole}, my team` });
    const oppToken = screen.getByRole('button', { name: `AMC, ${oppRole}, opponent` });
    expect(mineToken).toHaveTextContent('AMCL');
    expect(plateText(mineToken)).toContain(mineRole.replaceAll(' ', ''));
    expect(oppToken).toHaveTextContent('AMC');
    expect(plateText(oppToken)).toContain(oppRole.replaceAll(' ', ''));
    expect(screen.getAllByRole('button', { name: /my team$/ })).toHaveLength(11);
    expect(screen.getAllByRole('button', { name: /opponent$/ })).toHaveLength(11);

    const carrier = doc.players.find((player) => player.id === doc.scenario!.carrierId)!;
    const carrierRole = FM26_DATA.roles.find((role) => role.id === carrier.role)!.name;
    const carrierToken = screen.getByRole('button', {
      name: `${carrier.slot}, ${carrierRole}, my team`,
    });
    expect(translation(screen.getByRole('img', { name: 'Ball' }))).toEqual(
      ballAtopPosition(translation(carrierToken)),
    );
  });

  it('shows the transport bar only in FM mode and the bench only in Open pitch', () => {
    const store = exampleStore();
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bench' })).not.toBeInTheDocument();
    act(() => store.getState().setMode('openPitch'));
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bench' })).toBeInTheDocument();
    act(() => store.getState().setMode('fm'));
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bench' })).not.toBeInTheDocument();
  });

  it('matches the arrow count to the arrows setting, with rings at targets and none on the carrier', () => {
    const store = exampleStore();
    const { container } = render(<BoardDesktop store={store} />);
    const moving = movers(store);
    const carrierId = store.getState().doc.scenario!.carrierId;
    const carrierAt = selectPhasePositions(store.getState().doc).final.get(carrierId)!;
    expect(moving.length).toBeGreaterThan(1);
    expect(store.getState().ui.arrows).toBe('selected');
    expect(rings(container)).toHaveLength(0);

    const selected = moving[0]!;
    act(() => store.getState().patchUi({ selectedPlayerId: selected.id }));
    const selectedRings = rings(container);
    expect(selectedRings).toHaveLength(1);
    expect(selectedRings[0]).toHaveAttribute('cx', String(selected.to.x));
    expect(selectedRings[0]).toHaveAttribute('cy', String(selected.to.y));

    act(() => store.getState().patchUi({ arrows: 'all' }));
    const allRings = rings(container);
    expect(allRings).toHaveLength(moving.length);
    expect(
      allRings.some(
        (ring) =>
          Number(ring.getAttribute('cx')) === carrierAt.x &&
          Number(ring.getAttribute('cy')) === carrierAt.y,
      ),
    ).toBe(false);
  });

  it('renders the zone map and three columns at desktop width without the phone layout', () => {
    render(<BoardDesktop store={exampleStore()} />);
    const setup = screen.getByRole('region', { name: SETUP_COLUMN_LABEL });
    const side = screen.getByRole('region', { name: SIDE_COLUMN_LABEL });
    const pitch = screen.getByRole('img', { name: 'Pitch' });
    const columns = [...setup.parentElement!.querySelectorAll('[data-column]')];
    expect(columns.map((column) => column.getAttribute('data-column'))).toEqual([
      'setup',
      'pitch',
      'instrument',
    ]);
    expect(columns[1]).toContainElement(pitch);
    expect(setup).toHaveStyle({ width: '300px' });
    expect(side).toHaveStyle({ width: '300px' });
    expect(screen.getByRole('banner')).toBe(setup.parentElement!.parentElement!.firstElementChild);
    expect(screen.getByRole('heading', { name: 'Ball zone' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: ARROWS_LABEL })).toBeInTheDocument();
    expect(document.querySelector('[data-phone="true"]')).toBeNull();
  });
});
