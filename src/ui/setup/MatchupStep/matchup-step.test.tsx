import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createPitchStore } from '../../../state/store';
import { createInitialDocument } from '../../../state/document';
import { MatchupStep } from '.';

const MINE = '4_3_3_dm_wide';
const OPPONENT = '4_2_3_1_dm_wide';

function setup() {
  const store = createPitchStore({ doc: createInitialDocument(), ui: { mode: 'openPitch' } });
  render(<MatchupStep store={store} />);
  return store;
}

describe('MatchupStep', () => {
  it('keeps Apply matchup disabled until both teams have a formation', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Apply matchup' })).toBeDisabled();
  });

  it('uses the shared picker: two cards and More, with More choices leaving the cards unchecked', () => {
    setup();
    const grid = screen.getAllByRole('radiogroup')[0]!;
    expect(grid.querySelectorAll('[role="radio"]')).toHaveLength(2);
    const mine = within(grid);
    fireEvent.click(mine.getByRole('button', { name: 'More' }));
    fireEvent.click(mine.getByRole('radio', { name: '4-4-2 Diamond Narrow' }));
    expect(mine.getByRole('radio', { name: '4-4-2 Diamond Narrow' })).toBeChecked();
    expect(mine.getByRole('radio', { name: '4-3-3 DM Wide' })).not.toBeChecked();
    expect(mine.getByRole('radio', { name: '4-2-3-1 DM Wide' })).not.toBeChecked();
  });

  it('applies both formations in one step when Apply matchup is pressed', () => {
    const store = setup();
    const grids = screen.getAllByRole('radiogroup');
    fireEvent.click(grids[0]!.querySelectorAll('[role="radio"]')[0]!);
    fireEvent.click(grids[1]!.querySelectorAll('[role="radio"]')[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Apply matchup' }));
    expect(store.getState().doc.teams.mine).toMatchObject({
      formationId: MINE,
      applied: 'matchup',
    });
    expect(store.getState().doc.teams.opponent).toMatchObject({
      formationId: OPPONENT,
      applied: 'matchup',
    });
  });
});
