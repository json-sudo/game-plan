import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { BenchDropZone } from '.';

describe('BenchDropZone', () => {
  it('names the drop target for a piece being dragged off the pitch', () => {
    render(<BenchDropZone />);
    expect(screen.getByText('Drop here to bench')).toBeInTheDocument();
  });

  it('hands its element to the drag hook so drops can be located', () => {
    const ref = createRef<HTMLElement>();
    render(<BenchDropZone dropRef={ref} />);
    expect(ref.current).toBe(screen.getByText('Drop here to bench').closest('[data-bench-drop]'));
  });

  it('shows when a piece is over it', () => {
    const { rerender } = render(<BenchDropZone />);
    expect(screen.getByText('Drop here to bench').closest('[data-bench-drop]')).not.toHaveAttribute(
      'data-over',
    );
    rerender(<BenchDropZone over />);
    expect(screen.getByText('Drop here to bench').closest('[data-bench-drop]')).toHaveAttribute(
      'data-over',
      'true',
    );
  });
});
