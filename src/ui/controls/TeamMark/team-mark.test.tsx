import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TeamMark } from '.';

describe('TeamMark', () => {
  it('is decorative and carries the team and size', () => {
    const { container } = render(<TeamMark team="opp" size={12} />);
    const mark = container.firstElementChild!;
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveAttribute('data-team', 'opp');
    expect(mark).toHaveStyle({ width: '12px', height: '12px' });
  });

  it('defaults to 16px', () => {
    const { container } = render(<TeamMark team="mine" />);
    expect(container.firstElementChild).toHaveStyle({ width: '16px' });
  });
});
