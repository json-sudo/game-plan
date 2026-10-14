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

  it('picks the flank zones from the presets', async () => {
    const onPick = vi.fn<(zone: ZoneId) => void>();
    render(<ZoneMap onPick={onPick} presets />);
    await userEvent.click(screen.getByRole('button', { name: 'Attack down the left' }));
    await userEvent.click(screen.getByRole('button', { name: 'Attack down the right' }));
    expect(onPick.mock.calls).toEqual([['L-F'], ['R-F']]);
  });

  it('hides the presets by default', () => {
    render(<ZoneMap />);
    expect(screen.queryByRole('button', { name: 'Attack down the left' })).not.toBeInTheDocument();
  });

  it('shows the lane key', () => {
    render(<ZoneMap />);
    for (const lane of ['L', 'LH', 'C', 'RH', 'R']) {
      expect(screen.getByText(lane)).toBeInTheDocument();
    }
  });

  it('shows the full name and the ball for the selected zone', () => {
    render(<ZoneMap value="RH-F" carrier="ST" attackerName="Blue" />);
    expect(
      screen.getByText('Right half-space - final third', { selector: 'p' }),
    ).toBeInTheDocument();
    const cell = screen.getByRole('button', { name: 'Right half-space - final third' });
    expect(cell).toHaveAttribute('aria-pressed', 'true');
    expect(cell.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('On the ball: ST')).toBeInTheDocument();
    expect(screen.getByText(/Blue/)).toBeInTheDocument();
  });

  it('marks a picked carrier', () => {
    render(<ZoneMap value="C-M" carrier="ST" carrierChanged />);
    expect(screen.getByText('On the ball: ST (you picked)')).toBeInTheDocument();
  });

  it('shows the no-zone copy', () => {
    render(<ZoneMap value={null} />);
    expect(screen.getByText('No zone yet')).toBeInTheDocument();
    expect(screen.getByText('Tap a zone to put the ball there.')).toBeInTheDocument();
  });

  it('hatches unfinished zones and explains when one is picked', () => {
    const { rerender } = render(<ZoneMap unfinished={['C-D']} value="C-M" />);
    const cell = screen.getByRole('button', {
      name: 'Centre - defensive third, setup not finished',
    });
    expect(cell).toHaveAttribute('data-unfinished', 'true');
    expect(screen.getByRole('button', { name: 'Centre - middle third' })).not.toHaveAttribute(
      'data-unfinished',
    );
    expect(
      screen.queryByText('Finish setting up your tactic to see the runs.'),
    ).not.toBeInTheDocument();
    rerender(<ZoneMap unfinished={['C-D']} value="C-D" />);
    expect(screen.getByText('Finish setting up your tactic to see the runs.')).toBeInTheDocument();
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
