import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bench } from '.';
import type { BenchPiece } from '../BenchChip';

const PIECES: BenchPiece[] = [
  { id: 'a', label: 'Sub 14', team: 'opponent' },
  { id: 'b', label: 'Sub 12', team: 'mine' },
  { id: 'c', label: 'Sub 12', team: 'opponent' },
  { id: 'd', label: 'GK 2', team: 'opponent', keeper: true },
  { id: 'e', label: 'Sub 3', team: 'mine' },
];

function chipLabels() {
  return screen.getAllByRole('button').map((chip) => chip.textContent);
}

describe('Bench', () => {
  it('shows the heading and the on-pitch and on-bench counts', () => {
    render(<Bench pieces={PIECES.slice(0, 3)} placed={22} />);
    expect(screen.getByRole('heading', { name: 'Bench' })).toBeInTheDocument();
    expect(screen.getByText('22 on pitch · 3 on bench')).toBeInTheDocument();
  });

  it('orders keepers first, then by number, my team before the opponent', () => {
    render(<Bench pieces={PIECES} placed={22} />);
    expect(chipLabels()).toEqual(['GK 2', 'Sub 3', 'Sub 12', 'Sub 12', 'Sub 14']);
    const chips = screen.getAllByRole('button');
    expect(chips[2]).toHaveAccessibleName(expect.stringContaining('my team'));
    expect(chips[3]).toHaveAccessibleName(expect.stringContaining('opponent'));
  });

  it('shows the drop target as the first cell while dropping', () => {
    render(<Bench pieces={PIECES} placed={22} dropping />);
    const cells = screen.getAllByRole('listitem');
    expect(within(cells[0]).getByText('Drop here to bench')).toBeInTheDocument();
    expect(cells).toHaveLength(PIECES.length + 1);
  });

  it('shows the empty state when nothing is benched', () => {
    render(<Bench pieces={[]} placed={31} />);
    expect(screen.getByText('Bench is empty')).toBeInTheDocument();
    expect(screen.getByText('Drag a player off the pitch to bench them.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('marks the sheet layout', () => {
    const { container } = render(<Bench pieces={PIECES} placed={22} sheet />);
    expect(container.firstElementChild).toHaveAttribute('data-sheet');
  });
});
