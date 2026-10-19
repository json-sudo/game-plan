import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SquadControls, type SquadControlTeam } from '.';

const TEAMS: SquadControlTeam[] = [
  { team: 'mine', name: 'Reds', squadSize: 11, keeper: false, blockedSizes: [] },
  { team: 'opponent', name: 'Blues', squadSize: 20, keeper: true, blockedSizes: [11] },
];

describe('SquadControls', () => {
  it('offers the three squad sizes for each side and shows the current ones', () => {
    render(<SquadControls teams={TEAMS} onSquadSize={() => {}} onKeeper={() => {}} />);
    const reds = screen.getByRole('radiogroup', { name: 'Reds squad size' });
    expect(
      within(reds)
        .getAllByRole('radio')
        .map((radio) => radio.textContent),
    ).toEqual(['11', '20', '26']);
    expect(within(reds).getByRole('radio', { name: '11' })).toBeChecked();
    const blues = screen.getByRole('radiogroup', { name: 'Blues squad size' });
    expect(within(blues).getByRole('radio', { name: '20' })).toBeChecked();
  });

  it('reports a new size for the side it was chosen on', async () => {
    const onSquadSize = vi.fn<(team: string, size: number) => void>();
    render(<SquadControls teams={TEAMS} onSquadSize={onSquadSize} onKeeper={() => {}} />);
    const reds = screen.getByRole('radiogroup', { name: 'Reds squad size' });
    await userEvent.click(within(reds).getByRole('radio', { name: '26' }));
    expect(onSquadSize).toHaveBeenCalledExactlyOnceWith('mine', 26);
  });

  it('blocks a size that would remove a placed piece and says why', async () => {
    const onSquadSize = vi.fn<(team: string, size: number) => void>();
    render(<SquadControls teams={TEAMS} onSquadSize={onSquadSize} onKeeper={() => {}} />);
    const blues = screen.getByRole('radiogroup', { name: 'Blues squad size' });
    const blocked = within(blues).getByRole('radio', { name: '11' });
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    expect(blocked).toHaveAccessibleDescription(
      'Bench some players first - a smaller squad cannot move players off the pitch.',
    );
    await userEvent.click(blocked);
    expect(onSquadSize).not.toHaveBeenCalled();
  });

  it('toggles the keeper of the side it belongs to', async () => {
    const onKeeper = vi.fn<(team: string, keeper: boolean) => void>();
    render(<SquadControls teams={TEAMS} onSquadSize={() => {}} onKeeper={onKeeper} />);
    expect(screen.getByRole('switch', { name: 'Blues keeper' })).toBeChecked();
    await userEvent.click(screen.getByRole('switch', { name: 'Reds keeper' }));
    expect(onKeeper).toHaveBeenCalledExactlyOnceWith('mine', true);
  });
});
