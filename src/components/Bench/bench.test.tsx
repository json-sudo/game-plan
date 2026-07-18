import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardProvider, useBoardDispatch } from '../../board/BoardContext';
import { DragProvider } from '../../board/DragContext';
import { Bench } from '.';

function PlaceButton() {
  const dispatch = useBoardDispatch();
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'PLACE_PIECE', id: 'mine-1', position: { x: 30, y: 25 } })}
    >
      place CB
    </button>
  );
}

function renderBench() {
  return render(
    <BoardProvider>
      <DragProvider>
        <Bench />
        <PlaceButton />
      </DragProvider>
    </BoardProvider>,
  );
}

const pool = (name: string) => within(screen.getByRole('region', { name }));

describe('Bench', () => {
  it('renders both pools with all 11 benched tokens and 0/11 counters', () => {
    renderBench();
    expect(pool('My Team').getByText('0/11')).toBeInTheDocument();
    expect(pool('Opponent').getByText('0/11')).toBeInTheDocument();
    expect(pool('My Team').getAllByLabelText(/^my team /)).toHaveLength(11);
    expect(pool('Opponent').getAllByLabelText(/^opponent /)).toHaveLength(11);
    expect(screen.getByLabelText('ball')).toBeInTheDocument();
    expect(screen.getByText('drag to pitch')).toBeInTheDocument();
  });

  it('placing a piece removes it from the bench and updates the counter', async () => {
    renderBench();
    expect(pool('My Team').getAllByLabelText('my team CB')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'place CB' }));
    expect(pool('My Team').getByText('1/11')).toBeInTheDocument();
    expect(pool('My Team').getAllByLabelText('my team CB')).toHaveLength(1);
    expect(pool('Opponent').getByText('0/11')).toBeInTheDocument();
  });

  it('squad size control adds dashed sub tokens and updates the total', async () => {
    renderBench();
    await userEvent.click(pool('My Team').getByRole('button', { name: '26' }));
    expect(pool('My Team').getByText('0/26')).toBeInTheDocument();
    const subs = pool('My Team').getAllByLabelText(/^my team S\d+$/);
    expect(subs).toHaveLength(15);
    for (const sub of subs) expect(sub).toHaveClass('token--sub');
    expect(pool('Opponent').getByText('0/11')).toBeInTheDocument();
  });

  it('keeper toggle removes the GK token and lowers the total', async () => {
    renderBench();
    await userEvent.click(pool('My Team').getByRole('button', { name: /Keeper on/ }));
    expect(pool('My Team').getByRole('button', { name: /Keeper off/ })).toBeInTheDocument();
    expect(pool('My Team').queryByLabelText('my team GK')).not.toBeInTheDocument();
    expect(pool('My Team').getByText('0/10')).toBeInTheDocument();
    expect(pool('Opponent').getByLabelText('opponent GK')).toBeInTheDocument();
  });
});
