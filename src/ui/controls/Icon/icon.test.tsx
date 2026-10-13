import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon, ICON_NAMES } from '.';

describe('Icon', () => {
  it('ships the full set of 27 icons', () => {
    expect(ICON_NAMES).toHaveLength(27);
    expect(new Set(ICON_NAMES).size).toBe(27);
  });

  it.each(ICON_NAMES)('draws %s on the 24px grid in currentColor', (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '1.75');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('hides a decorative icon from assistive tech', () => {
    const { container } = render(<Icon name="save" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('exposes a standalone icon by its title', () => {
    render(<Icon name="alert" title="Warning" />);
    expect(screen.getByRole('img', { name: 'Warning' })).toBeInTheDocument();
  });

  it('defaults to 20px and accepts a size', () => {
    const { container, rerender } = render(<Icon name="check" />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '20');
    rerender(<Icon name="check" size={16} />);
    expect(container.querySelector('svg')).toHaveAttribute('height', '16');
  });

  it('fills the play, back and next triangles', () => {
    for (const name of ['play', 'back', 'next'] as const) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector('path[fill="currentColor"]')).not.toBeNull();
      unmount();
    }
  });

  it('merges a class name', () => {
    const { container } = render(<Icon name="up" className="extra" />);
    expect(container.querySelector('svg')).toHaveClass('extra');
  });
});
