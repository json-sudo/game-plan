import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../../data/fm26';
import { createExampleDocument } from '../../../state/example';
import { createInitialDocument, isSetupComplete, placedPlayers } from '../../../state/document';
import { createPitchStore } from '../../../state/store';
import {
  SETUP_ROLES,
  SETUP_ROLES_PHONE_HINT,
  SETUP_STEP_FORMATIONS,
  SETUP_STEP_WHO_ATTACKS,
  TOKEN_TEAM_LABELS,
  setupRoleChoiceLabel,
} from '../../copy';
import { applyAction } from '../../../state/actions';
import { formationSummary } from '../setup-model';
import { SetupFlow } from '.';

function renderFlow(step: 1 | 2 | 3, doc = createInitialDocument()) {
  const store = createPitchStore({ doc, ui: { setupStep: step, mode: 'fm' } });
  render(<SetupFlow store={store} phone />);
  return store;
}

describe('SetupFlow on phones', () => {
  it('renders only the Formations step on step 1', () => {
    renderFlow(1);
    expect(screen.getByRole('radiogroup', { name: 'My team' })).toBeInTheDocument();
    expect(
      screen.queryByRole('radiogroup', { name: SETUP_STEP_WHO_ATTACKS }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders only the Who attacks step on step 2', () => {
    renderFlow(2, createExampleDocument());
    expect(screen.getByRole('radiogroup', { name: SETUP_STEP_WHO_ATTACKS })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'My team' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders only the Roles step on step 3', () => {
    renderFlow(3, createExampleDocument());
    expect(screen.getByText(SETUP_ROLES_PHONE_HINT)).toBeInTheDocument();
    expect(
      screen.queryByRole('radiogroup', { name: SETUP_STEP_WHO_ATTACKS }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
  });

  it('disables Back on step 1', () => {
    renderFlow(1);
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('enables Back on step 2', () => {
    renderFlow(2, createExampleDocument());
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
  });

  it('renders a done step as its one-line summary only', () => {
    const doc = createExampleDocument();
    renderFlow(2, doc);
    const formations = screen.getAllByRole('listitem')[0];
    expect(within(formations).getByText(formationSummary(doc)!)).toBeInTheDocument();
    expect(within(formations).queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('dispatches applyFormation when a formation is chosen', async () => {
    const user = userEvent.setup();
    const store = renderFlow(1);
    const formations = within(screen.getByRole('radiogroup', { name: 'My team' }));
    await user.click(formations.getByRole('radio', { name: FM26_DATA.formations[1].name }));
    expect(store.getState().doc.teams.mine.formationId).toBe(FM26_DATA.formations[1].id);
  });

  it('dispatches setAttacker when the attacking side is chosen', async () => {
    const user = userEvent.setup();
    const doc = createExampleDocument();
    const store = renderFlow(2, doc);
    await user.click(
      within(screen.getByRole('radiogroup', { name: SETUP_STEP_WHO_ATTACKS })).getByRole('radio', {
        name: doc.teams.opponent.name,
      }),
    );
    expect(store.getState().doc.attacker).toBe('opponent');
  });

  it('dispatches setRole when a role is chosen', async () => {
    const user = userEvent.setup();
    const doc = createExampleDocument();
    const store = renderFlow(3, doc);
    const player = placedPlayers(doc).find((candidate) => candidate.role && candidate.slot);
    expect(player).toBeDefined();
    const select = screen.getByRole('combobox', {
      name: setupRoleChoiceLabel(player!.slot!, TOKEN_TEAM_LABELS[player!.team]),
    });
    const next = Array.from((select as HTMLSelectElement).options).find(
      (option) => option.value !== player!.role,
    );
    await user.selectOptions(select, next!.value);
    expect(store.getState().doc.players.find((p) => p.id === player!.id)?.role).toBe(next!.value);
  });
});

describe('SetupFlow step list', () => {
  const mineOnly = () =>
    applyAction(createInitialDocument(), {
      type: 'applyFormation',
      team: 'mine',
      formationId: FM26_DATA.formations[0].id,
    });

  it('has Formations and Roles only without an opponent, and three steps with one', () => {
    renderFlow(1, mineOnly());
    const titles = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(titles).toHaveLength(2);
    expect(titles[0]).toContain(SETUP_STEP_FORMATIONS);
    expect(titles[1]).toContain(SETUP_ROLES);
    cleanup();
    renderFlow(1, createExampleDocument());
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('goes from Formations straight to Roles with default roles, and back', async () => {
    const user = userEvent.setup();
    const store = renderFlow(1, mineOnly());
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(store.getState().ui.setupStep).toBe(3);
    expect(isSetupComplete(store.getState().doc)).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(store.getState().ui.setupStep).toBe(1);
  });

  it('finishes from Roles with Done', async () => {
    const user = userEvent.setup();
    const store = renderFlow(1, mineOnly());
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: /Done|Save/ }));
    expect(store.getState().ui.setupStep).toBeNull();
  });

  it('reopens the Roles step from its Edit button', async () => {
    const user = userEvent.setup();
    const done = applyAction(mineOnly(), { type: 'fillDefaultRoles' });
    const store = renderFlow(1, done);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(store.getState().ui.setupStep).toBeNull();
    await user.click(screen.getByRole('button', { name: `Edit ${SETUP_ROLES}` }));
    expect(store.getState().ui.setupStep).toBe(3);
  });
});
