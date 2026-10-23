import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand';
import { FM26_DATA } from '../../../data/fm26';
import {
  createInitialDocument,
  placedPlayers,
  playerSide,
  type Player,
} from '../../../state/document';
import { pieceLabel } from '../../../state/bench-pieces';
import { createExampleDocument, EXAMPLE_FORMATIONS } from '../../../state/example';
import { createPitchStore, type PitchStore } from '../../../state/store';
import {
  RESET_DISABLED_REASON,
  SETUP_ROLES,
  SETUP_STEP_FORMATIONS,
  SETUP_STEP_WHO_ATTACKS,
  SETUP_COLUMN_LABEL,
  UNDO_DISABLED_REASON,
  ROLE_CURRENT_MARK,
  ROLE_PHASE_LABELS,
  roleCount,
  setupRoleChoiceLabel,
  tokenSideLabel,
} from '../../copy';
import { BoardDesktop } from '.';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

const MINE_AMCL = exampleSlotId('mine', 'AMCL');
const MINE_ST = exampleSlotId('mine', 'ST');
const OPPONENT_AMC = exampleSlotId('opponent', 'AMC');

function playerLabel(player: Player): string {
  return pieceLabel(createExampleDocument(), player, FM26_DATA);
}

function labelWithSide(player: Player): string {
  const side = playerSide(player);
  return [playerLabel(player), side ? tokenSideLabel(side) : null].filter(Boolean).join(', ');
}

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

beforeEach(() => {
  window.matchMedia = vi
    .fn<
      () => {
        matches: boolean;
        addEventListener: () => void;
        removeEventListener: () => void;
      }
    >()
    .mockReturnValue({
      matches: false,
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
    }) as unknown as typeof window.matchMedia;
});

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
    const applied = store.getState().doc.players.find((player) => player.id === MINE_ST)!.base;
    act(() => {
      store.getState().dispatch({ type: 'movePlayer', playerId: MINE_ST, point: { x: 1, y: 1 } });
    });
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(store.getState().doc.players.find((player) => player.id === MINE_ST)!.base).toEqual(
      applied,
    );
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(store.getState().doc.players.find((player) => player.id === MINE_ST)!.base).toEqual({
      x: 1,
      y: 1,
    });
  });

  it('switches mode through the store and keeps the two layouts apart', async () => {
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
    expect(placedPlayers(store.getState().doc)).toHaveLength(0);
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
    expect(store.getState().doc.players.find((player) => player.id === MINE_ST)!.base).toEqual({
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

describe('desktop board', () => {
  it('renders the example with both formations and the 4-3-3 and 4-2-3-1 labels on the tokens', () => {
    const doc = createExampleDocument();
    const store = exampleStore();
    render(<BoardDesktop store={store} />);
    const mine = formationName(EXAMPLE_FORMATIONS.mine);
    const opponent = formationName(EXAMPLE_FORMATIONS.opponent);
    expect(mine).toContain('4-3-3');
    expect(opponent).toContain('4-2-3-1');

    const mineWide = doc.players.find((player) => player.id === MINE_AMCL)!;
    const oppStriker = doc.players.find((player) => player.id === OPPONENT_AMC)!;
    const mineRole = FM26_DATA.roles.find((role) => role.id === mineWide.role)!.name;
    const oppRole = FM26_DATA.roles.find((role) => role.id === oppStriker.role)!.name;
    const mineToken = screen.getByRole('button', {
      name: `AM(L), left side, ${mineRole}, my team`,
    });
    const oppToken = screen.getByRole('button', { name: `AM(C), ${oppRole}, opponent` });
    expect(mineToken).toHaveTextContent('AM(L)');
    expect(plateText(mineToken)).toContain(mineRole.replaceAll(' ', ''));
    expect(oppToken).toHaveTextContent('AM(C)');
    expect(plateText(oppToken)).toContain(oppRole.replaceAll(' ', ''));
    expect(screen.getAllByRole('button', { name: /my team$/ })).toHaveLength(11);
    expect(screen.getAllByRole('button', { name: /opponent$/ })).toHaveLength(11);
  });

  it('shows the zone map only in FM mode and the bench only in Open pitch', () => {
    const store = exampleStore();
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('heading', { name: 'Ball zone' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bench' })).not.toBeInTheDocument();
    act(() => store.getState().setMode('openPitch'));
    expect(screen.queryByRole('heading', { name: 'Ball zone' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bench' })).toBeInTheDocument();
  });

  it('shows no playback, arrows, carrier choice, pass control or first-run hint in FM mode', () => {
    const { container } = render(<BoardDesktop store={exampleStore()} />);
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Arrows' })).not.toBeInTheDocument();
    expect(container.querySelector('circle[data-part="arrow-ring"]')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Who has the ball?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Pass to' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: 'How to use the example' }),
    ).not.toBeInTheDocument();
  });

  it('renders the zone map and three columns at desktop width without the phone layout', () => {
    render(<BoardDesktop store={exampleStore()} />);
    const setup = screen.getByRole('region', { name: SETUP_COLUMN_LABEL });
    const pitch = screen.getByRole('img', { name: 'Pitch' });
    const columns = [...setup.parentElement!.querySelectorAll('[data-column]')];
    expect(columns.map((column) => column.getAttribute('data-column'))).toEqual([
      'setup',
      'pitch',
      'instrument',
    ]);
    expect(columns[1]).toContainElement(pitch);
    expect(screen.getByRole('banner')).toBe(setup.parentElement!.parentElement!.firstElementChild);
    expect(screen.getByRole('heading', { name: 'Ball zone' })).toBeInTheDocument();
    expect(document.querySelector('[data-phone="true"]')).toBeNull();
  });
});

describe('top bar actions', () => {
  it('calls setMode with fm and openPitch', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createInitialDocument() });
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('radio', { name: 'Open pitch' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'FM mode' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'FM mode' }));
    expect(store.getState().ui.mode).toBe('fm');
    await user.click(screen.getByRole('radio', { name: 'Open pitch' }));
    expect(store.getState().ui.mode).toBe('openPitch');
  });

  it('disables Reset and Undo with their reasons when there is nothing to revert', () => {
    const store = createPitchStore({ doc: createInitialDocument() });
    render(<BoardDesktop store={store} />);
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveAccessibleDescription(
      RESET_DISABLED_REASON,
    );
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAccessibleDescription(
      UNDO_DISABLED_REASON,
    );
  });

  it('clears every piece on the open pitch, and one undo brings them back', async () => {
    const user = userEvent.setup();
    const store = exampleStore({ mode: 'openPitch' });
    const before = store.getState().doc;
    render(<BoardDesktop store={store} />);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(store.getState().doc.players.some((player) => player.base)).toBe(false);
    expect(store.getState().doc.ball).toEqual(before.ball);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(store.getState().doc).toEqual(before);
  });

  it('leaves the FM layout alone when Clear is pressed', async () => {
    const user = userEvent.setup();
    const store = exampleStore();
    const before = store.getState().tactic;
    render(<BoardDesktop store={store} />);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(store.getState().tactic).toBe(before);
  });

  it('updates dataset.theme and does not write localStorage', async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const store = exampleStore();
    render(<BoardDesktop store={store} />);
    await user.click(screen.getByRole('button', { name: 'Dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(store.getState().ui.theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Light theme' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(store.getState().ui.theme).toBe('light');
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    delete document.documentElement.dataset.theme;
  });
});

function guidedSteps() {
  return within(screen.getByRole('region', { name: 'Guided setup' })).getAllByRole('listitem');
}

describe('setup', () => {
  it('marks each setup step active, done or reopened from setupStep', () => {
    const fresh = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'fm' } });
    fresh
      .getState()
      .dispatch({ type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' });
    const { rerender } = render(<BoardDesktop store={fresh} />);
    let steps = guidedSteps();
    expect(steps.map((step) => step.getAttribute('data-state'))).toEqual([
      'active',
      'todo',
      'todo',
    ]);
    expect(steps[0]).not.toHaveAttribute('data-reopened');
    expect(within(steps[0]!).getByText(SETUP_STEP_FORMATIONS)).toBeInTheDocument();
    expect(within(steps[1]!).getByText(SETUP_STEP_WHO_ATTACKS)).toBeInTheDocument();
    expect(within(steps[2]!).getByText(SETUP_ROLES)).toBeInTheDocument();

    act(() => fresh.getState().patchUi({ setupStep: 2 }));
    steps = guidedSteps();
    expect(steps[0]).toHaveAttribute('data-state', 'done');
    expect(steps[1]).toHaveAttribute('data-state', 'active');
    expect(steps[1]).not.toHaveAttribute('data-reopened');
    expect(steps[2]).toHaveAttribute('data-state', 'todo');

    const finished = exampleStore();
    rerender(<BoardDesktop store={finished} />);
    steps = guidedSteps();
    expect(steps.map((step) => step.getAttribute('data-state'))).toEqual(['done', 'done', 'done']);

    act(() => finished.getState().patchUi({ setupStep: 2 }));
    steps = guidedSteps();
    expect(steps[0]).toHaveAttribute('data-state', 'done');
    expect(steps[1]).toHaveAttribute('data-state', 'active');
    expect(steps[1]).toHaveAttribute('data-reopened', 'true');
    expect(steps[2]).toHaveAttribute('data-state', 'done');
  });

  it('dispatches applyFormation, setAttacker and setRole for the choice in each step', async () => {
    const user = userEvent.setup();
    const formations = createPitchStore({
      doc: createInitialDocument(),
      ui: { mode: 'fm', setupStep: 1 },
    });
    const dispatch = vi.spyOn(formations.getState(), 'dispatch');
    const { rerender } = render(<BoardDesktop store={formations} />);
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'My team' })).getByRole('radio', {
        name: '4-4-2 Diamond Narrow',
      }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: 'applyFormation',
      team: 'mine',
      formationId: '4_4_2_diamond_narrow',
    });
    expect(screen.getByRole('button', { name: 'GK, my team' })).toBeInTheDocument();

    const attacking = exampleStore({ setupStep: 2 });
    const attackDispatch = vi.spyOn(attacking.getState(), 'dispatch');
    rerender(<BoardDesktop store={attacking} />);
    await user.click(screen.getByRole('radio', { name: 'Opponent' }));
    expect(attackDispatch).toHaveBeenCalledWith({ type: 'setAttacker', attacker: 'opponent' });
    expect(screen.getByRole('group', { name: 'Opponent' })).toHaveTextContent('Attacking');
    expect(screen.getByRole('group', { name: 'My team' })).not.toHaveTextContent('Attacking');

    const roles = exampleStore({ setupStep: 3 });
    const striker = roles.getState().doc.players.find((player) => player.id === MINE_ST)!;
    const nextRole = FM26_DATA.roles.find(
      (role) =>
        role.id !== striker.role &&
        role.possession === 'in' &&
        role.families.includes(striker.family!),
    )!;
    const roleDispatch = vi.spyOn(roles.getState(), 'dispatch');
    rerender(<BoardDesktop store={roles} />);
    await user.selectOptions(
      screen.getByRole('combobox', { name: setupRoleChoiceLabel('ST', 'my team') }),
      nextRole.id,
    );
    expect(roleDispatch).toHaveBeenCalledWith({
      type: 'setRole',
      playerId: MINE_ST,
      roleId: nextRole.id,
    });
    const token = screen.getByRole('button', { name: `ST, ${nextRole.name}, my team` });
    expect(plateText(token)).toContain(nextRole.name.replaceAll(' ', ''));
  });
});

function widePlayer(store: StoreApi<PitchStore>) {
  const player = store.getState().doc.players.find((item) => item.id === MINE_AMCL);
  if (!player?.slot || !player.family || !player.role)
    throw new Error('example wide player missing');
  return player;
}

function validRoles(player: ReturnType<typeof widePlayer>) {
  return FM26_DATA.roles.filter(
    (role) => role.possession === 'in' && role.families.includes(player.family!),
  );
}

function radioName(name: string) {
  return new RegExp(`^${name}(\\s*${ROLE_CURRENT_MARK})?$`);
}

function silencePitchMatrix() {
  const svg = screen.getByRole('img', { name: 'Pitch' });
  Object.defineProperty(svg, 'getScreenCTM', { configurable: true, value: () => null });
}

describe('role picker anchor', () => {
  it('opens beside a token in FM mode with the slot heading, and stays closed in Open pitch', async () => {
    const user = userEvent.setup();
    const store = exampleStore();
    const player = widePlayer(store);
    const roles = validRoles(player);
    const current = roles.find((role) => role.id === player.role)!;
    render(<BoardDesktop store={store} />);
    silencePitchMatrix();

    await user.click(
      screen.getByRole('button', { name: `${labelWithSide(player)}, ${current.name}, my team` }),
    );

    const picker = screen.getByRole('region', { name: playerLabel(player) });
    expect(screen.getByRole('heading', { name: playerLabel(player) })).toBeInTheDocument();
    expect(
      screen.getByText(
        [ROLE_PHASE_LABELS.IP, tokenSideLabel('left'), roleCount(roles.length)].join(' · '),
      ),
    ).toBeInTheDocument();
    const compact = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, '');
    expect(
      within(picker)
        .getAllByRole('radio')
        .map((input) => compact(input.closest('label')?.textContent)),
    ).toEqual(
      roles.map((role) =>
        compact(role.id === current.id ? `${role.name} ${ROLE_CURRENT_MARK}` : role.name),
      ),
    );
    expect(
      within(
        within(picker)
          .getByRole('radio', { name: radioName(current.name) })
          .closest('label')!,
      ).getByText(ROLE_CURRENT_MARK),
    ).toBeInTheDocument();

    act(() => {
      store.getState().setMode('openPitch');
      store
        .getState()
        .dispatch({ type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' });
    });
    expect(screen.queryByRole('region', { name: playerLabel(player) })).not.toBeInTheDocument();
    silencePitchMatrix();
    await user.click(screen.getByRole('button', { name: `${labelWithSide(player)}, my team` }));
    expect(screen.queryByRole('region', { name: playerLabel(player) })).not.toBeInTheDocument();
  });

  it('dispatches setRole for the chosen row, and Escape closes the picker and returns focus to the token', async () => {
    const user = userEvent.setup();
    const store = exampleStore();
    const player = widePlayer(store);
    const next = validRoles(player).find((role) => role.id !== player.role)!;
    const current = FM26_DATA.roles.find((role) => role.id === player.role)!;
    render(<BoardDesktop store={store} />);
    silencePitchMatrix();
    const token = screen.getByRole('button', {
      name: `${labelWithSide(player)}, ${current.name}, my team`,
    });
    await user.click(token);
    const dispatch = vi.spyOn(store.getState(), 'dispatch');
    await user.click(screen.getByRole('radio', { name: radioName(next.name) }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'setRole',
      playerId: player.id,
      roleId: next.id,
    });
    const updated = screen.getByRole('button', {
      name: `${labelWithSide(player)}, ${next.name}, my team`,
    });
    expect(plateText(updated)).toContain(next.name.replaceAll(' ', ''));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: playerLabel(player) })).not.toBeInTheDocument();
    expect(updated).toHaveFocus();
  });
});
