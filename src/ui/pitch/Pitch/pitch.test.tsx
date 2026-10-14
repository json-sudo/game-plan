import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Pitch } from '.';

describe('Pitch', () => {
  it('is an image named by label with the full pitch viewBox', () => {
    render(<Pitch label="Pitch for 4-3-3" />);
    const svg = screen.getByRole('img', { name: 'Pitch for 4-3-3' });
    expect(svg.getAttribute('viewBox')).toBe('0 0 76.19 100');
  });

  it('crops with viewBox', () => {
    render(<Pitch label="Crop" viewBox="0 50 76.19 50" />);
    expect(screen.getByRole('img', { name: 'Crop' }).getAttribute('viewBox')).toBe('0 50 76.19 50');
  });

  it('draws ten bands and children inside the SVG', () => {
    const { container } = render(
      <Pitch label="Pitch">
        <circle data-testid="child" r="1" />
      </Pitch>,
    );
    expect(container.querySelectorAll('[data-band]')).toHaveLength(10);
    expect(screen.getByTestId('child').closest('svg')).toBe(screen.getByRole('img'));
  });

  it('shows the notice plate only with notice', () => {
    const { rerender } = render(<Pitch label="Pitch" />);
    expect(screen.queryByText('Finish setting up your tactic')).toBeNull();
    rerender(<Pitch label="Pitch" notice="Finish setting up your tactic" />);
    expect(screen.getByText('Finish setting up your tactic')).toBeTruthy();
  });
});
