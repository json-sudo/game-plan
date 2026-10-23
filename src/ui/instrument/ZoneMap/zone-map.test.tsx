import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ZoneId } from '../../../data/zones';
import { ZoneMap } from '.';

describe('ZoneMap', () => {
  it('picks a zone at once with its id', async () => {
    const onPick = vi.fn<(zone: ZoneId) => void>();
    render(<ZoneMap onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Right half-space - final third' }));
    expect(onPick).toHaveBeenCalledExactlyOnceWith('RH-F');
  });

  it('has no attack presets', () => {
    render(<ZoneMap />);
    expect(screen.queryByRole('button', { name: /Attack down/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(15);
  });

  it('sizes the lane columns 15.5 : 12.3 : 20.6 : 12.3 : 15.5', () => {
    const { container } = render(<ZoneMap />);
    const grid = container.querySelector<HTMLElement>('[data-lane="L"]')?.parentElement;
    expect(grid?.style.gridTemplateColumns).toBe('15.5fr 12.3fr 20.6fr 12.3fr 15.5fr');
  });

  it('tells the user to tap another zone once a zone is picked', () => {
    render(<ZoneMap value="C-F" />);
    expect(screen.getByText('Tap another zone to see a new visualization.')).toBeInTheDocument();
  });

  it('is locked until setup is done and does not pick', async () => {
    const onPick = vi.fn<(zone: ZoneId) => void>();
    render(<ZoneMap locked onPick={onPick} />);
    expect(screen.getByText('No zone yet')).toBeInTheDocument();
    expect(screen.getByText('Finish setting up your tactic to pick a zone.')).toBeInTheDocument();
    const cell = screen.getByRole('button', { name: 'Right half-space - final third' });
    expect(cell).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(cell);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('shows the lane key', () => {
    render(<ZoneMap />);
    for (const lane of ['L', 'LH', 'C', 'RH', 'R']) {
      expect(screen.getByText(lane)).toBeInTheDocument();
    }
  });

  it('shows the full name and the ball for the selected zone', () => {
    render(<ZoneMap value="RH-F" attackerName="Blue" />);
    expect(
      screen.getByText('Right half-space - final third', { selector: 'p' }),
    ).toBeInTheDocument();
    const cell = screen.getByRole('button', { name: 'Right half-space - final third' });
    expect(cell).toHaveAttribute('aria-pressed', 'true');
    expect(cell.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText(/Blue/)).toBeInTheDocument();
  });

  it('shows the no-zone copy', () => {
    render(<ZoneMap value={null} />);
    expect(screen.getByText('No zone yet')).toBeInTheDocument();
    expect(screen.getByText('Tap a zone to put the ball there.')).toBeInTheDocument();
  });

  it('reaches every cell by keyboard', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn<(zone: ZoneId) => void>();
    render(<ZoneMap onPick={onPick} />);
    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(15);
    for (const cell of cells) expect(cell).toHaveAccessibleName();
    await user.tab();
    expect(cells[0]).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledExactlyOnceWith('L-F');
  });
});
