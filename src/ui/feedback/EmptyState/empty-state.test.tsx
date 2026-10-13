import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '.';

describe('EmptyState', () => {
  it('shows a title and a help line', () => {
    render(
      <EmptyState title="Bench is empty">Drag a player off the pitch to bench them.</EmptyState>,
    );
    expect(screen.getByText('Bench is empty')).toBeInTheDocument();
    expect(screen.getByText('Drag a player off the pitch to bench them.')).toBeInTheDocument();
  });

  it('works with a title alone', () => {
    const { container } = render(<EmptyState title="No saved tactics yet" />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});
