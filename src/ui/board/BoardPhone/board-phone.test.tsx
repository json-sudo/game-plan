import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialDocument } from '../../../state/document';
import { createPitchStore } from '../../../state/store';
import { EXAMPLE_FORMATIONS } from '../../../state/example';
import { RESET_DISABLED_REASON, THEME_DARK_LABEL, UNDO_DISABLED_REASON } from '../../copy';
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
