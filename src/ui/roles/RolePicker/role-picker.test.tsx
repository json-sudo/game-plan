import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RolePicker, type RolePickerRole } from '.';

const ROLES: RolePickerRole[] = [
  {
    id: 'w',
    name: 'Winger',
    desc: 'Hugs the touchline.',
    from: { x: 60, y: 40 },
    to: { x: 60, y: 15 },
  },
  {
    id: 'if',
    name: 'Inside forward',
    desc: 'Cuts inside.',
    from: { x: 60, y: 40 },
    to: { x: 40, y: 15 },
  },
  {
    id: 'ap',
    name: 'Advanced playmaker',
    desc: 'Drifts into pockets.',
    from: { x: 60, y: 40 },
    to: { x: 60, y: 40 },
  },
];

describe('RolePicker', () => {
  it('names the slot, side, possession and role count for in possession', () => {
    render(<RolePicker slotLabel="AM(R)" side="right" phase="IP" roles={ROLES} current="w" />);
    expect(screen.getByRole('heading', { name: 'AM(R)' })).toBeInTheDocument();
    expect(screen.getByText('In possession · right side · 3 roles')).toBeInTheDocument();
  });

  it('names the phase for out of possession', () => {
    render(<RolePicker slotLabel="DM" side="left" phase="OOP" roles={ROLES} current="w" />);
    expect(screen.getByText('Out of possession · left side · 3 roles')).toBeInTheDocument();
  });

  it('marks only the current role', () => {
    render(<RolePicker slotLabel="AM(R)" phase="IP" roles={ROLES} current="if" />);
    const row = screen.getByRole('radio', { name: /Inside forward/ }).closest('label')!;
    expect(within(row).getByText('Current')).toBeInTheDocument();
    expect(screen.getAllByText('Current')).toHaveLength(1);
  });

  it('moves between rows with the arrow keys and chooses at once', async () => {
    const onChoose = vi.fn<(id: string) => void>();
    render(
      <RolePicker
        slotLabel="AM(R)"
        phase="IP"
        roles={ROLES}
        current="w"
        value="w"
        onChoose={onChoose}
      />,
    );
    screen.getByRole('radio', { name: /Winger/ }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onChoose).toHaveBeenLastCalledWith('if');
    expect(screen.getByRole('radio', { name: /Inside forward/ })).toHaveFocus();
  });

  it('chooses a row on click and has no Save button', async () => {
    const onChoose = vi.fn<(id: string) => void>();
    render(
      <RolePicker slotLabel="AM(R)" phase="IP" roles={ROLES} current="w" onChoose={onChoose} />,
    );
    await userEvent.click(screen.getByRole('radio', { name: /Advanced playmaker/ }));
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('ap');
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('shows the description and preview of the chosen role', () => {
    render(<RolePicker slotLabel="AM(R)" phase="IP" roles={ROLES} current="w" value="ap" />);
    expect(screen.getByText('Drifts into pockets.')).toBeInTheDocument();
    expect(screen.getByText('Holds position')).toBeInTheDocument();
  });
});
