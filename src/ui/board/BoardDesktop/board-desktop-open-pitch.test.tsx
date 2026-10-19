import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialDocument, placedPlayers, playersOf } from '../../../state/document';
import { createExampleDocument } from '../../../state/example';
import { createPitchStore } from '../../../state/store';
import { BoardDesktop } from '.';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

const SCALE = 2;
const BENCH_RECT = { left: 1000, top: 0, right: 1200, bottom: 400 };

function stubSvg(svg: Element) {
  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({ a: SCALE, b: 0, c: 0, d: SCALE, e: 0, f: 0 }),
  });
  svg.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 76.19 * SCALE,
      bottom: 100 * SCALE,
      width: 76.19 * SCALE,
      height: 100 * SCALE,
    }) as DOMRect;
}

function stubBench() {
  const bench = screen.getByRole('heading', { name: 'Bench' }).closest('section')!;
  bench.getBoundingClientRect = () => ({ ...BENCH_RECT }) as DOMRect;
}

function openPitch(doc = createInitialDocument()) {
  const store = createPitchStore({ doc, ui: { mode: 'openPitch' } });
  render(<BoardDesktop store={store} />);
  stubSvg(screen.getByRole('img', { name: 'Pitch' }));
  stubBench();
  return store;
}

function dragFrom(element: Element, to: { x: number; y: number }, start = { x: 5, y: 5 }) {
  fireEvent.pointerDown(element, { clientX: start.x, clientY: start.y });
  fireEvent.pointerMove(window, { clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(window, { clientX: to.x, clientY: to.y });
}

function chip(name: RegExp | string) {
  return within(screen.getByRole('heading', { name: 'Bench' }).closest('section')!).getByRole(
    'button',
    { name },
  );
}

beforeEach(() => {
  window.matchMedia = vi
    .fn<() => { matches: boolean; addEventListener: () => void; removeEventListener: () => void }>()
    .mockReturnValue({
      matches: false,
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
    }) as unknown as typeof window.matchMedia;
});

describe('Open pitch defaults', () => {
  it('starts empty with 11 players per side waiting on the bench', () => {
    const store = openPitch();
    expect(placedPlayers(store.getState().doc)).toHaveLength(0);
    expect(screen.getByText('0 on pitch · 22 on bench')).toBeInTheDocument();
    for (const side of ['My team', 'Opponent']) {
      const group = screen.getByRole('radiogroup', { name: `${side} squad size` });
      expect(within(group).getByRole('radio', { name: '11' })).toBeChecked();
    }
  });

  it('has no zone map, carrier choice, pass control or transport', () => {
    openPitch();
    expect(screen.queryByRole('heading', { name: 'Ball zone' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Who has the ball?' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Pass to' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
  });
});

describe('Open pitch ball', () => {
  it('moves only the ball when dragged, even right on top of a player', () => {
    const doc = createExampleDocument();
    const store = openPitch({ ...doc, scenario: null });
    const before = store.getState().doc;
    const target = before.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base!;
    dragFrom(screen.getByRole('button', { name: 'Ball' }), {
      x: target.x * SCALE,
      y: target.y * SCALE,
    });
    const after = store.getState().doc;
    expect(after.ball).toEqual(target);
    expect(after.players).toBe(before.players);
    expect(after.scenario).toBeNull();
    expect(after.attacker).toBe(before.attacker);
  });

  it('draws the ball at its own spot, not on a player', () => {
    const store = openPitch(createExampleDocument());
    const { x, y } = store.getState().doc.ball;
    expect(screen.getByRole('button', { name: 'Ball' }).style.transform).toBe(
      `translate(${x}px, ${y}px)`,
    );
  });
});

describe('Open pitch players', () => {
  it('moves only the dragged player', () => {
    const store = openPitch(createExampleDocument());
    const before = store.getState().doc;
    dragFrom(screen.getByRole('button', { name: 'ST, my team' }), { x: 60, y: 80 });
    const after = store.getState().doc;
    expect(after.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base).toEqual({
      x: 30,
      y: 40,
    });
    const others = (doc: typeof before) =>
      doc.players.filter((p) => p.id !== exampleSlotId('mine', 'ST'));
    expect(others(after)).toEqual(others(before));
    expect(after.ball).toEqual(before.ball);
  });

  it('clamps a drag that ends outside the pitch rectangle to the pitch bounds', () => {
    const store = openPitch(createExampleDocument());
    fireEvent.pointerDown(screen.getByRole('button', { name: 'ST, my team' }), {
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerMove(window, { clientX: -400, clientY: 600 });
    expect(store.getState().ui.drag?.point).toEqual({ x: 0, y: 100 });
    fireEvent.pointerCancel(window);
  });

  it('nudges a focused player with the arrow keys and benches it with Delete', () => {
    const store = openPitch(createExampleDocument());
    const token = screen.getByRole('button', { name: 'ST, my team' });
    const start = store
      .getState()
      .doc.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base!;
    fireEvent.keyDown(token, { key: 'ArrowRight' });
    expect(
      store.getState().doc.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base,
    ).toEqual({
      x: start.x + 1,
      y: start.y,
    });
    fireEvent.keyDown(token, { key: 'Delete' });
    expect(
      store.getState().doc.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base,
    ).toBeUndefined();
  });
});

describe('Bench', () => {
  it('shows each benched player by its full name when it has one', () => {
    const doc = {
      ...createInitialDocument(),
      players: createInitialDocument().players.map((p) =>
        p.id === 'mine-1' ? { ...p, customName: 'Bukayo Saka Jr' } : p,
      ),
    };
    openPitch(doc);
    expect(chip(/Bukayo Saka Jr/)).toHaveTextContent('Bukayo Saka Jr');
  });

  it('puts a bench player on the pitch at the drop point', () => {
    const store = openPitch();
    dragFrom(chip('GK, my team'), { x: 60, y: 80 }, { x: 1100, y: 20 });
    const player = store.getState().doc.players.find((p) => p.id === 'mine-1')!;
    expect(player.base).toEqual({ x: 30, y: 40 });
    expect(screen.getByRole('button', { name: 'GK, my team' })).toBeInTheDocument();
    expect(store.getState().ui.drag).toBeNull();
    expect(store.getState().history.past).toHaveLength(1);
  });

  it('sends a placed player back to the bench when dropped there', () => {
    const store = openPitch(createExampleDocument());
    const before = store.getState().doc;
    dragFrom(screen.getByRole('button', { name: 'ST, my team' }), { x: 1100, y: 100 });
    const after = store.getState().doc;
    expect(after.players.find((p) => p.id === exampleSlotId('mine', 'ST'))!.base).toBeUndefined();
    expect(after.players.filter((p) => p.base)).toHaveLength(
      before.players.filter((p) => p.base).length - 1,
    );
    expect(chip(/ST, my team/)).toBeInTheDocument();
  });

  it('shows where to drop while a placed player is over the bench', () => {
    const store = openPitch(createExampleDocument());
    fireEvent.pointerDown(screen.getByRole('button', { name: 'ST, my team' }), {
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerMove(window, { clientX: 1100, clientY: 100 });
    expect(screen.getByText('Drop here to bench')).toBeInTheDocument();
    fireEvent.pointerCancel(window);
    expect(store.getState().ui.drag).toBeNull();
  });

  it('leaves the document untouched when a drop lands outside the pitch and the bench', () => {
    const store = openPitch(createExampleDocument());
    const before = store.getState();
    dragFrom(screen.getByRole('button', { name: 'ST, my team' }), { x: 600, y: 900 });
    expect(store.getState().doc).toBe(before.doc);
    expect(store.getState().history).toBe(before.history);
  });

  it('keeps a bench player on the bench when it is dropped outside', () => {
    const store = openPitch();
    const before = store.getState();
    dragFrom(chip('GK, my team'), { x: 600, y: 900 }, { x: 1100, y: 20 });
    expect(store.getState().doc).toBe(before.doc);
    expect(store.getState().ui.drag).toBeNull();
    expect(chip('GK, my team')).toBeInTheDocument();
  });

  it('places a bench player from the keyboard and keeps the pieces apart', async () => {
    const user = userEvent.setup();
    const store = openPitch();
    chip('GK, my team').focus();
    await user.keyboard('{Enter}');
    chip('ST, my team').focus();
    await user.keyboard('{Enter}');
    const [first, second] = placedPlayers(store.getState().doc).map((p) => p.base!);
    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThanOrEqual(8.5);
  });
});

describe('Squad size', () => {
  it('adds bench players when the squad grows and leaves pitch pieces alone', async () => {
    const user = userEvent.setup();
    const store = openPitch(createExampleDocument());
    const before = store.getState().doc;
    const group = screen.getByRole('radiogroup', { name: 'My team squad size' });
    await user.click(within(group).getByRole('radio', { name: '26' }));
    const after = store.getState().doc;
    expect(after.teams.mine.squadSize).toBe(26);
    expect(playersOf(after, 'mine')).toHaveLength(26);
    expect(after.players.filter((p) => p.base)).toEqual(before.players.filter((p) => p.base));
    expect(playersOf(after, 'opponent')).toHaveLength(playersOf(before, 'opponent').length);
  });

  it('keeps a size that would drop a placed piece unavailable, with the reason', () => {
    const doc = createInitialDocument();
    const store = createPitchStore({ doc, ui: { mode: 'openPitch' } });
    store.getState().dispatch({ type: 'setSquadSize', team: 'mine', size: 20 });
    for (let index = 1; index <= 12; index += 1) {
      store.getState().dispatch({
        type: 'movePlayer',
        playerId: `mine-${index}`,
        point: { x: 10 + index, y: 50 },
      });
    }
    render(<BoardDesktop store={store} />);
    const group = screen.getByRole('radiogroup', { name: 'My team squad size' });
    const blocked = within(group).getByRole('radio', { name: '11' });
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    expect(blocked).toHaveAccessibleDescription(/cannot move players off the pitch/);
    const opponent = screen.getByRole('radiogroup', { name: 'Opponent squad size' });
    expect(within(opponent).getByRole('radio', { name: '11' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });
});
