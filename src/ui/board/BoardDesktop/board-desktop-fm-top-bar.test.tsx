import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPitchStore } from '../../../state/store';
import { BoardDesktop } from '.';

vi.mock('../../export/png', () => ({
  renderPng: vi.fn<() => Promise<Blob>>().mockResolvedValue(new Blob(['png'])),
}));

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.resolve() } });
  URL.createObjectURL = vi.fn<() => string>().mockReturnValue('blob:preview');
  URL.revokeObjectURL = vi.fn<() => void>();
});
afterEach(() => vi.unstubAllGlobals());

const CELL = 'Right flank - final third';

function setupBoard() {
  const store = createPitchStore({ ui: { mode: 'fm' } });
  render(<BoardDesktop store={store} />);
  return store;
}

async function finishSetup() {
  const user = userEvent.setup();
  await user.click(
    within(screen.getByRole('radiogroup', { name: 'My team' })).getByRole('radio', {
      name: '4-3-3 DM Wide',
    }),
  );
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: /^(Done|Save)$/ }));
  return user;
}

describe('FM zone map lock', () => {
  it('is locked before setup, unlocked after Done and stays unlocked when a step is reopened', async () => {
    setupBoard();
    const cell = () => screen.getByRole('button', { name: CELL });
    expect(cell()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Finish setting up your tactic to pick a zone.')).toBeInTheDocument();
    const user = await finishSetup();
    expect(cell()).not.toHaveAttribute('aria-disabled');
    await user.click(screen.getByRole('button', { name: 'Edit Formations' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(cell()).not.toHaveAttribute('aria-disabled');
  });
});

describe('FM Reset, Clear, Export and Share', () => {
  it('disables Reset and Clear with their reasons, and enables Reset after a zone pick', async () => {
    const store = setupBoard();
    const user = await finishSetup();
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveAccessibleDescription(
      'Pick a zone and start a visualization first.',
    );
    expect(screen.getByRole('button', { name: 'Clear' })).toHaveAccessibleDescription(
      'Clear is for Open pitch. Use Reset in FM mode.',
    );
    await user.click(screen.getByRole('button', { name: CELL }));
    const reset = screen.getByRole('button', { name: 'Reset' });
    expect(reset).not.toHaveAttribute('aria-disabled');
    await user.click(reset);
    expect(store.getState().doc.scenario).toBeNull();
    expect(screen.getByRole('button', { name: 'Clear' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the FM tooltips on Export PNG and Share tactic', () => {
    setupBoard();
    expect(screen.getByRole('button', { name: 'Export PNG' })).toHaveAccessibleDescription(
      'Export PNG of this frame',
    );
    expect(screen.getByRole('button', { name: 'Share tactic' })).toHaveAccessibleDescription(
      'Saves the zone and visualization',
    );
  });

  it('opens the Share dialog with a link that holds the setup', async () => {
    setupBoard();
    const user = await finishSetup();
    await user.click(screen.getByRole('button', { name: 'Share tactic' }));
    const link = screen.getByRole<HTMLInputElement>('textbox', { name: 'Link' });
    expect(link.value).toContain('#s=');
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });

  it('opens the Export dialog without downloading', async () => {
    setupBoard();
    const user = await finishSetup();
    await user.click(screen.getByRole('button', { name: CELL }));
    await user.click(screen.getByRole('button', { name: 'Export PNG' }));
    expect(screen.getByRole('dialog', { name: 'Export PNG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getAllByText(CELL).length).toBeGreaterThan(0);
  });
});
