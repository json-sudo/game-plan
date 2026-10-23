import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createExampleDocument } from '../../../state/example';
import { createPitchStore } from '../../../state/store';
import { SETUP_ROLES_HINT, SETUP_ROLES_PHONE_HINT } from '../../copy';
import { RolesStep } from '.';

function renderStep(phone: boolean) {
  const store = createPitchStore({
    doc: createExampleDocument(),
    ui: { setupStep: 3, mode: 'fm' },
  });
  render(<RolesStep store={store} phone={phone} />);
  return store;
}

describe('RolesStep', () => {
  it('opens the role picker from a row on desktop and applies a pick at once', async () => {
    const user = userEvent.setup();
    const store = renderStep(false);
    expect(screen.getByText(SETUP_ROLES_HINT)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^ST\s/ }));
    const before = store.getState().doc.players.find((p) => p.team === 'mine' && p.family === 'ST');
    const other = within(screen.getByRole('radiogroup', { name: 'ST' }))
      .getAllByRole('radio')
      .find((radio) => (radio as HTMLInputElement).value !== before?.role);
    await user.click(other!);
    const after = store.getState().doc.players.find((p) => p.id === before?.id);
    expect(after?.role).toBe((other as HTMLInputElement).value);
  });

  it('is read-only on phones', () => {
    renderStep(true);
    expect(screen.getByText(SETUP_ROLES_PHONE_HINT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ST\s/ })).not.toBeInTheDocument();
  });
});
