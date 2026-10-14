import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { zoneName } from '../../../engine';
import { createInitialDocument } from '../../../state/document';
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
      'Bench',
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
  it('opens the bench as a sheet from the menu in Open pitch, and Escape returns focus to the menu', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'openPitch' } });
    render(<BoardPhone store={store} />);
    await user.click(within(await openMenu()).getByRole('menuitem', { name: 'Bench' }));
    const sheet = screen.getByRole('dialog', { name: 'Bench' });
    expect(within(sheet).getByRole('heading', { name: BENCH_HEADING })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Bench' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
  });

  it('shows the squad size and keeper controls for the attacking side', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'openPitch' } });
    render(<BoardPhone store={store} />);
    await user.click(within(await openMenu()).getByRole('menuitem', { name: 'Bench' }));
    const sheet = screen.getByRole('dialog', { name: 'Bench' });
    const attacker = store.getState().doc.attacker;
    await user.click(within(sheet).getByRole('radio', { name: '26' }));
    expect(store.getState().doc.teams[attacker].squadSize).toBe(26);
    await user.click(within(sheet).getByRole('switch', { name: 'Keeper' }));
    expect(store.getState().doc.teams[attacker].keeper).toBe(true);
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

  it('picking a zone dispatches the same tapZone action as desktop', async () => {
    const user = userEvent.setup();
    const store = createPitchStore({ doc: createExampleDocument(), ui: { mode: 'fm' } });
    render(<BoardPhone store={store} />);
    await user.click(screen.getByRole('button', { name: zoneName('C-F') }));
    expect(store.getState().doc.scenario?.zone).toBe('C-F');
  });
});
