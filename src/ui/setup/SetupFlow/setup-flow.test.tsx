import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../../data/fm26';
import { createExampleDocument } from '../../../state/example';
import { createInitialDocument, isSetupComplete } from '../../../state/document';
import { createPitchStore } from '../../../state/store';
import {
  FORMATION_MORE_LABEL,
  NO_OPPONENT_LABEL,
  ROLE_CHANGED_TOOLTIP,
  ROLE_LIST_HEADINGS,
  SETUP_FORMATION_NEXT_REASON,
  SETUP_OPPONENT_LABEL,
  SETUP_ROLES,
  SETUP_ROLES_PHONE_HINT,
  SETUP_ROLES_RECOMPUTE_NOTE,
  SETUP_STEP_FORMATIONS,
  SETUP_STEP_WHO_ATTACKS,
} from '../../copy';
import { applyAction } from '../../../state/actions';
import { formationSummary } from '../setup-model';
import { SetupFlow } from '.';

function renderFlow(step: 1 | 2 | 3, doc = createInitialDocument(), phone = true) {
  const store = createPitchStore({ doc, ui: { setupStep: step, mode: 'fm' } });
  render(<SetupFlow store={store} phone={phone} />);
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
    expect(screen.getByText(ROLE_LIST_HEADINGS.in)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('offers Cancel instead of Back on step 1, and counts steps without an opponent', () => {
    renderFlow(1);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('enables Back on step 2', () => {
    renderFlow(2, createExampleDocument());
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
  });

  it('renders a done step as its one-line summary only', () => {
    const doc = createExampleDocument();
    renderFlow(2, doc);
    expect(screen.getByText(formationSummary(doc)!)).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'My team' })).not.toBeInTheDocument();
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

  it('lists roles read-only on phones', () => {
    renderFlow(3, createExampleDocument());
    expect(screen.queryByRole('button', { name: /AM\(L\)/ })).not.toBeInTheDocument();
    expect(screen.getByText('AM(L)')).toBeInTheDocument();
  });
});

describe('SetupFlow formations step', () => {
  it('disables Next with its reason until my formation is picked, and checks No opponent', async () => {
    const user = userEvent.setup();
    renderFlow(1, createInitialDocument(), false);
    expect(screen.getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByText(SETUP_FORMATION_NEXT_REASON).length).toBeGreaterThan(0);
    const opponent = within(screen.getByRole('radiogroup', { name: SETUP_OPPONENT_LABEL }));
    expect(opponent.getByRole('radio', { name: NO_OPPONENT_LABEL })).toBeChecked();
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'My team' })).getByRole('radio', {
        name: FM26_DATA.formations[0].name,
      }),
    );
    expect(screen.getByRole('button', { name: 'Next' })).not.toHaveAttribute('aria-disabled');
    expect(screen.queryByText(SETUP_FORMATION_NEXT_REASON)).not.toBeInTheDocument();
  });

  it('offers two cards and More in each grid', () => {
    renderFlow(1, createInitialDocument(), false);
    const mine = within(screen.getByRole('radiogroup', { name: 'My team' }));
    expect(mine.getAllByRole('radio')).toHaveLength(2);
    expect(mine.getByRole('button', { name: FORMATION_MORE_LABEL })).toBeInTheDocument();
    const opponent = within(screen.getByRole('radiogroup', { name: SETUP_OPPONENT_LABEL }));
    expect(opponent.getAllByRole('radio')).toHaveLength(3);
    expect(opponent.getByRole('button', { name: FORMATION_MORE_LABEL })).toBeInTheDocument();
  });

  it('selects a formation from More and leaves both cards unchecked', async () => {
    const user = userEvent.setup();
    const store = renderFlow(1, createInitialDocument(), false);
    const mine = within(screen.getByRole('radiogroup', { name: 'My team' }));
    await user.click(mine.getByRole('button', { name: FORMATION_MORE_LABEL }));
    await user.click(mine.getByRole('radio', { name: FM26_DATA.formations[2].name }));
    expect(store.getState().doc.teams.mine.formationId).toBe(FM26_DATA.formations[2].id);
    expect(mine.getByRole('radio', { name: FM26_DATA.formations[2].name })).toBeChecked();
    expect(mine.getByRole('radio', { name: FM26_DATA.formations[0].name })).not.toBeChecked();
    expect(mine.getByRole('radio', { name: FM26_DATA.formations[1].name })).not.toBeChecked();
  });

  it('adds Who attacks when an opponent is picked and removes it on No opponent', async () => {
    const user = userEvent.setup();
    const mineOnly = applyAction(createInitialDocument(), {
      type: 'applyFormation',
      team: 'mine',
      formationId: FM26_DATA.formations[0].id,
    });
    const store = renderFlow(1, mineOnly, false);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const opponent = within(screen.getByRole('radiogroup', { name: SETUP_OPPONENT_LABEL }));
    await user.click(opponent.getByRole('radio', { name: FM26_DATA.formations[1].name }));
    expect(store.getState().doc.teams.opponent.formationId).toBe(FM26_DATA.formations[1].id);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(SETUP_STEP_WHO_ATTACKS)).toBeInTheDocument();
    await user.click(opponent.getByRole('radio', { name: NO_OPPONENT_LABEL }));
    expect(store.getState().doc.teams.opponent.formationId).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText(SETUP_STEP_WHO_ATTACKS)).not.toBeInTheDocument();
  });

  it('summarises formations with and without an opponent', () => {
    const mineOnly = applyAction(createInitialDocument(), {
      type: 'applyFormation',
      team: 'mine',
      formationId: FM26_DATA.formations[0].id,
    });
    const done = applyAction(mineOnly, { type: 'fillDefaultRoles' });
    const store = createPitchStore({ doc: done, ui: { setupStep: null, mode: 'fm' } });
    render(<SetupFlow store={store} />);
    expect(screen.getByText('4-3-3 DM Wide · no opponent')).toBeInTheDocument();
    cleanup();
    render(
      <SetupFlow
        store={createPitchStore({
          doc: createExampleDocument(),
          ui: { setupStep: null, mode: 'fm' },
        })}
      />,
    );
    expect(screen.getByText('4-3-3 DM Wide v 4-2-3-1 DM Wide')).toBeInTheDocument();
  });
});

describe('SetupFlow roles step', () => {
  const mineOnly = () =>
    applyAction(
      applyAction(createInitialDocument(), {
        type: 'applyFormation',
        team: 'mine',
        formationId: FM26_DATA.formations[0].id,
      }),
      { type: 'fillDefaultRoles' },
    );

  it('heads the list by who attacks and shows one team at a time', async () => {
    const user = userEvent.setup();
    const store = renderFlow(3, createExampleDocument(), false);
    expect(screen.getByText(ROLE_LIST_HEADINGS.in)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: store.getState().doc.teams.opponent.name }));
    expect(screen.getByText(ROLE_LIST_HEADINGS.out)).toBeInTheDocument();
  });

  it('changing AM(L) to Inside Forward shows the changed dot and the 1 changed summary', async () => {
    const user = userEvent.setup();
    const store = renderFlow(3, mineOnly(), false);
    expect(screen.queryByTitle(ROLE_CHANGED_TOOLTIP)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /AM\(L\)/ }));
    await user.click(screen.getByRole('radio', { name: /Inside Forward/ }));
    const player = store.getState().doc.players.find((p) => p.family === 'AM(L)');
    expect(player?.role).toBe('inside_forward_ip');
    expect(
      within(screen.getByRole('button', { name: /AM\(L\)/ })).getByTitle(ROLE_CHANGED_TOOLTIP),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Done|Save/ }));
    expect(screen.getByText('11 roles set · 1 changed')).toBeInTheDocument();
  });

  it('warns that a role change recomputes the visualization only while a zone is set', () => {
    renderFlow(3, mineOnly(), false);
    expect(screen.queryByText(SETUP_ROLES_RECOMPUTE_NOTE)).not.toBeInTheDocument();
    cleanup();
    renderFlow(3, applyAction(mineOnly(), { type: 'tapZone', zone: 'L-F' }), false);
    expect(screen.getByText(SETUP_ROLES_RECOMPUTE_NOTE)).toBeInTheDocument();
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
    renderFlow(1, mineOnly(), false);
    const titles = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(titles).toHaveLength(2);
    expect(titles[0]).toContain(SETUP_STEP_FORMATIONS);
    expect(titles[1]).toContain(SETUP_ROLES);
    cleanup();
    renderFlow(1, createExampleDocument(), false);
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
    const store = renderFlow(1, done, false);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(store.getState().ui.setupStep).toBeNull();
    await user.click(screen.getByRole('button', { name: `Edit ${SETUP_ROLES}` }));
    expect(store.getState().ui.setupStep).toBe(3);
  });
});
