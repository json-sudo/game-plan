import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ROLE_CHANGED_TOOLTIP } from '../../copy';
import { RoleList } from '.';

const ROWS = [
  { id: 'a', label: 'ST', role: 'Poacher' },
  { id: 'b', label: 'AM(L)', role: 'Inside Forward', changed: true },
];
const NAMES = { mine: 'My team', opponent: 'Opponent' };

describe('RoleList', () => {
  it('marks only changed rows with the dot and its tooltip', () => {
    render(<RoleList heading="In possession roles" rows={ROWS} team="mine" teamNames={NAMES} />);
    expect(screen.getAllByTitle(ROLE_CHANGED_TOOLTIP)).toHaveLength(1);
    expect(screen.getByRole('button', { name: /AM\(L\)/ })).toContainElement(
      screen.getByTitle(ROLE_CHANGED_TOOLTIP),
    );
  });

  it('selects a row on desktop and shows plain rows when read-only', async () => {
    const onSelect = vi.fn<(id: string) => void>();
    const { rerender } = render(
      <RoleList heading="Roles" rows={ROWS} team="mine" teamNames={NAMES} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /ST/ }));
    expect(onSelect).toHaveBeenCalledWith('a');
    rerender(<RoleList heading="Roles" rows={ROWS} team="mine" teamNames={NAMES} readOnly />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the team switch only when asked', async () => {
    const onTeam = vi.fn<(team: string) => void>();
    render(
      <RoleList
        heading="Roles"
        rows={ROWS}
        team="mine"
        teamNames={NAMES}
        showTeamSwitch
        onTeam={onTeam}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Opponent' }));
    expect(onTeam).toHaveBeenCalledWith('opponent');
  });
});
