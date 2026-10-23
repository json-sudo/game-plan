import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FM26_DATA } from '../../../data/fm26';
import { zoneName } from '../../../engine';
import { activeRoleOf } from '../../../state/context';
import { createInitialDocument, placedPlayers, type PitchDocument } from '../../../state/document';
import { createPitchStore } from '../../../state/store';
import { createExampleDocument, EXAMPLE_FORMATIONS } from '../../../state/example';
import {
  BENCH_HEADING,
  PITCH_LABEL,
  RESET_DISABLED_REASON,
  THEME_DARK_LABEL,
  TRANSPORT_PLAY_LABEL,
  UNDO_DISABLED_REASON,
  ZONE_MAP_HEADING,
} from '../../copy';
import { BoardPhone } from '.';

beforeEach(() => {
  window.matchMedia = vi
    .fn<() => { matches: boolean; addEventListener: () => void; removeEventListener: () => void }>()
    .mockReturnValue({
      matches: true,
      addEventListener: vi.fn<() => void>(),
      removeEventListener: vi.fn<() => void>(),
    }) as unknown as typeof window.matchMedia;
});

function roleNameOf(doc: PitchDocument, playerId: string) {
  const player = doc.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`no player ${playerId}`);
  const roleId = activeRoleOf(doc, player, FM26_DATA);
  return FM26_DATA.roles.find((role) => role.id === roleId)?.name ?? '';
}

function pitchTokens() {
  return within(screen.getByRole('img', { name: PITCH_LABEL })).getAllByRole('button');
}

function shownRolePlates() {
  return Array.from(document.querySelectorAll('svg g[aria-hidden="true"]'), (group) =>
    (group.textContent ?? '').replace(/\s/g, ''),
  ).filter((text) => text.length > 0);
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
  return screen.getByRole('menu', { name: 'More' });
}

describe('BoardPhone top bar', () => {
  it('shows the title, Undo and Menu, and no share, save, load, export or copy control', () => {
    const store = createPitchStore({ doc: createInitialDocument() });
    render(<BoardPhone store={store} />);
    expect(screen.getByText('My team v Opponent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /share|save|load|export|copy/i }),
    ).not.toBeInTheDocument();
  });

  it('disables Undo with its reason until an edit is committed, then reverts it', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createInitialDocument() });
    render(<BoardPhone store={store} />);
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAccessibleDescription(
      UNDO_DISABLED_REASON,
    );
    act(() => {
      store.getState().dispatch({ type: 'renameTeam', team: 'mine', name: 'Reds' });
    });
    expect(screen.getByText('Reds v Opponent')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('My team v Opponent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAccessibleDescription(
      UNDO_DISABLED_REASON,
    );
  });
});

describe('BoardPhone menu', () => {
  it('holds the mode toggle, Reset, Clear and the theme toggle', async () => {
    const store = createPitchStore({ doc: createInitialDocument() });
    render(<BoardPhone store={store} />);
    const menu = await openMenu();
    const names = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    expect(names).toEqual([
      'Mode: Open pitch',
      `Reset${RESET_DISABLED_REASON}`,
      'Clear',
      THEME_DARK_LABEL,
    ]);
  });

  it('disables Reset with its reason until a formation is applied', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createInitialDocument() });
    render(<BoardPhone store={store} />);
    expect(
      within(await openMenu()).getByRole('menuitem', { name: /Reset/ }),
    ).toHaveAccessibleDescription(RESET_DISABLED_REASON);
    act(() => {
      store.getState().dispatch({
        type: 'applyFormation',
        team: 'mine',
        formationId: EXAMPLE_FORMATIONS.mine,
      });
    });
    await user.keyboard('{Escape}');
    expect(within(await openMenu()).getByRole('menuitem', { name: /Reset/ })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});

describe('BoardPhone bench sheet', () => {
  it('opens the bench as a sheet from its button in Open pitch, and Escape returns focus to that button', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'openPitch' } });
    render(<BoardPhone store={store} />);
    await user.click(screen.getByRole('button', { name: /^Bench \(\d+\)$/ }));
    const sheet = screen.getByRole('dialog', { name: 'Bench' });
    expect(within(sheet).getByRole('heading', { name: BENCH_HEADING })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Bench' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Bench \(\d+\)$/ })).toHaveFocus();
  });

  it('shows the squad size and keeper controls for both sides', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'openPitch' } });
    render(<BoardPhone store={store} />);
    await user.click(screen.getByRole('button', { name: /^Bench \(\d+\)$/ }));
    const sheet = screen.getByRole('dialog', { name: 'Bench' });
    const mine = within(sheet).getByRole('radiogroup', { name: 'My team squad size' });
    const opponent = within(sheet).getByRole('radiogroup', { name: 'Opponent squad size' });
    await user.click(within(mine).getByRole('radio', { name: '26' }));
    expect(store.getState().doc.teams.mine.squadSize).toBe(26);
    await user.click(within(opponent).getByRole('radio', { name: '20' }));
    expect(store.getState().doc.teams.opponent.squadSize).toBe(20);
    await user.click(within(sheet).getByRole('switch', { name: 'My team keeper' }));
    expect(store.getState().doc.teams.mine.keeper).toBe(true);
    expect(store.getState().doc.teams.opponent.keeper).toBe(false);
  });

  it('places a tapped bench player on the pitch and closes the sheet', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'openPitch' } });
    render(<BoardPhone store={store} />);
    await user.click(screen.getByRole('button', { name: /^Bench \(\d+\)$/ }));
    const sheet = screen.getByRole('dialog', { name: 'Bench' });
    await user.click(within(sheet).getByRole('button', { name: 'GK, my team' }));
    expect(store.getState().doc.players.find((p) => p.id === 'mine-1')!.base).toBeDefined();
    expect(screen.queryByRole('dialog', { name: 'Bench' })).not.toBeInTheDocument();
    expect(store.getState().doc.ball).toEqual(createInitialDocument().ball);
  });

  it('is not offered in FM mode', async () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    expect(
      within(await openMenu()).queryByRole('menuitem', { name: 'Bench' }),
    ).not.toBeInTheDocument();
  });
});

describe('BoardPhone board', () => {
  it('renders the zone map in FM mode only, and the bench in-page in neither mode', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    expect(screen.getByRole('heading', { name: ZONE_MAP_HEADING })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: BENCH_HEADING })).not.toBeInTheDocument();
    act(() => {
      store.getState().setMode('openPitch');
    });
    expect(screen.queryByRole('heading', { name: ZONE_MAP_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: BENCH_HEADING })).not.toBeInTheDocument();
  });

  it('renders the framed pitch below the top bar', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    const menu = screen.getByRole('button', { name: 'Menu' });
    const pitch = screen.getByRole('img', { name: PITCH_LABEL });
    expect(menu.compareDocumentPosition(pitch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('picking a zone puts the ball there and records only the zone', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    await user.click(screen.getByRole('button', { name: zoneName('C-F') }));
    expect(store.getState().doc.ball.y).toBeLessThan(35);
    expect(store.getState().doc.scenario).toEqual({ zone: 'C-F', sequenceIndex: 0 });
  });

  it('shows no playback, carrier choice, pass control or first-run hint in FM mode', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    expect(screen.queryByRole('button', { name: TRANSPORT_PLAY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Who has the ball?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Pass to' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('complementary', { name: 'How to use the example' }),
    ).not.toBeInTheDocument();
  });
});

describe('BoardPhone tokens', () => {
  it('tapping a token shows its role name for that player only, with no role picker', async () => {
    const user = userEvent.setup();
    const doc = createExampleDocument();
    const store = createPitchStore({ doc, ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    const [first, second] = placedPlayers(doc);
    const tokens = pitchTokens();
    await user.click(tokens[0]);
    expect(shownRolePlates()).toEqual([roleNameOf(doc, first.id).replace(/\s/g, '')]);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    await user.click(tokens[1]);
    expect(shownRolePlates()).toEqual([roleNameOf(doc, second.id).replace(/\s/g, '')]);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('tapping a token in Open pitch selects it without showing a role name', async () => {
    const user = userEvent.setup();
    const doc = createExampleDocument();
    const store = createPitchStore({ doc, ui: { mode: 'openPitch' } });
    render(<BoardPhone store={store} />);
    const token = pitchTokens()[0];
    await user.click(token);
    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(shownRolePlates()).toEqual([]);
  });
});
