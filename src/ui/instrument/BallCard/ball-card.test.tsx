import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BallCard } from '.';

describe('BallCard', () => {
  it('names the zone the ball is in', () => {
    render(<BallCard zone="RH-M" atCentre={false} onCentre={() => {}} />);
    expect(screen.getByText('Right half-space - middle third')).toBeInTheDocument();
    expect(screen.getByText('Drag the ball anywhere on the pitch.')).toBeInTheDocument();
  });

  it('shows the centre spot before the ball moves', () => {
    render(<BallCard zone="C-M" atCentre onCentre={() => {}} />);
    expect(screen.getByText('Centre spot')).toBeInTheDocument();
  });

  it('sends the ball back to the centre spot', () => {
    const onCentre = vi.fn<() => void>();
    render(<BallCard zone="RH-M" atCentre={false} onCentre={onCentre} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ball to the centre spot' }));
    expect(onCentre).toHaveBeenCalledOnce();
  });

  it('disables the back button on the centre spot with a reason', () => {
    render(<BallCard zone="C-M" atCentre onCentre={() => {}} />);
    const back = screen.getByRole('button', { name: 'Ball to the centre spot' });
    expect(back).toHaveAttribute('aria-disabled', 'true');
    expect(back).toHaveAccessibleDescription('The ball is on the centre spot.');
  });
});
