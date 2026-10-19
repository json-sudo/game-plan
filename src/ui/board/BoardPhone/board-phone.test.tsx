import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

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
  it('renders the transport bar in FM mode only, and the bench in-page in neither mode', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    expect(screen.getByRole('button', { name: TRANSPORT_PLAY_LABEL })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: BENCH_HEADING })).not.toBeInTheDocument();
    act(() => {
      store.getState().setMode('openPitch');
    });
    expect(screen.queryByRole('button', { name: TRANSPORT_PLAY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: BENCH_HEADING })).not.toBeInTheDocument();
  });

  it('renders the zone map below the transport bar in FM mode', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    const play = screen.getByRole('button', { name: TRANSPORT_PLAY_LABEL });
    const zoneMap = screen.getByRole('heading', { name: ZONE_MAP_HEADING });
    expect(play.compareDocumentPosition(zoneMap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the framed pitch below the top bar', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    const menu = screen.getByRole('button', { name: 'Menu' });
    const pitch = screen.getByRole('img', { name: PITCH_LABEL });
    expect(menu.compareDocumentPosition(pitch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('picking a zone puts the ball there and offers only the eligible players', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    await user.click(screen.getByRole('button', { name: zoneName('C-F') }));
    expect(store.getState().doc.ball.y).toBeLessThan(35);
    expect(store.getState().doc.scenario).toBeNull();
    const picker = screen.getByRole('group', { name: 'Who has the ball?' });
    expect(
      within(picker)
        .getAllByRole('radio')
        .map((r) => r.getAttribute('aria-label')),
    ).toEqual(['ST - Deep-Lying Forward']);
    await user.click(within(picker).getByRole('radio', { name: 'ST - Deep-Lying Forward' }));
    expect(store.getState().doc.scenario).toEqual({
      zone: 'C-F',
      carrierId: exampleSlotId('mine', 'ST'),
    });
  });

  it('shows the carrier choice and pass control below the zone map in FM mode only', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    const zoneMap = screen.getByRole('heading', { name: ZONE_MAP_HEADING });
    const picker = screen.getByRole('group', { name: 'Who has the ball?' });
    const pass = screen.getByRole('combobox', { name: 'Pass to' });
    expect(zoneMap.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(picker.compareDocumentPosition(pass) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    act(() => store.getState().setMode('openPitch'));
    expect(screen.queryByRole('group', { name: 'Who has the ball?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Pass to' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: ZONE_MAP_HEADING })).not.toBeInTheDocument();
  });

  it('starts a pass from the pass control', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Pass to' }),
      exampleSlotId('mine', 'DR'),
    );
    await user.click(screen.getByRole('button', { name: 'Pass' }));
    expect(store.getState().ui.action).toEqual({
      type: 'pass',
      receiverId: exampleSlotId('mine', 'DR'),
    });
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

describe('BoardPhone first-run hint', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const hintName = { name: 'How to use the example' };

  it('shows above the pitch with the phone wording', () => {
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    const hint = screen.getByRole('complementary', hintName);
    expect(
      within(hint).getByText('Step through with Next, or tap a player to see its role.'),
    ).toBeInTheDocument();
    const pitch = screen.getByRole('img', { name: PITCH_LABEL });
    expect(hint.compareDocumentPosition(pitch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Got it dismisses it without writing to localStorage or touching the document or history', async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const pushState = vi.spyOn(window.history, 'pushState');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    const before = store.getState().doc;
    render(<BoardPhone store={store} />);
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('complementary', hintName)).not.toBeInTheDocument();
    expect(store.getState().doc).toBe(before);
    expect(setItem).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('returns on the next load', () => {
    const first = render(
      <BoardPhone store={createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } })} />,
    );
    first.unmount();
    render(
      <BoardPhone store={createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } })} />,
    );
    expect(screen.getByRole('complementary', hintName)).toBeInTheDocument();
  });
});
