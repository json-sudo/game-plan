import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ball } from '.';
import { BallGlyph } from '../BallGlyph';

describe('Ball', () => {
  it('sits at x and y with the default radius', () => {
    render(
      <svg>
        <Ball x={12} y={34} />
      </svg>,
    );
    const ball = screen.getByRole('img', { name: 'Ball' });
    expect(ball.style.transform).toBe('translate(12px, 34px)');
    expect(ball.querySelector('g')).toHaveAttribute('transform', 'scale(1.2)');
  });

  it('takes a radius and a label', () => {
    render(
      <svg>
        <Ball x={0} y={0} r={2} label="Ball at feet" />
      </svg>,
    );
    const ball = screen.getByRole('img', { name: 'Ball at feet' });
    expect(ball.querySelector('g')).toHaveAttribute('transform', 'scale(2)');
  });
});

describe('BallGlyph', () => {
  it('draws the ball as a decorative svg at size', () => {
    const { container } = render(<BallGlyph size={24} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg.querySelectorAll('polygon').length).toBeGreaterThan(0);
  });

  it('defaults to 16px', () => {
    const { container } = render(<BallGlyph />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '16');
  });
});
