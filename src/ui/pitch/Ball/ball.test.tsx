import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Ball } from '.';
import { BallGlyph } from '../BallGlyph';

const scale = { ppu: 8, tokenPx: 32, hitPx: 40 };

describe('Ball', () => {
  it('is a focusable piece named Ball', () => {
    render(
      <svg>
        <Ball x={0} y={0} scale={scale} />
      </svg>,
    );
    const ball = screen.getByRole('button', { name: 'Ball' });
    expect(ball).toHaveAttribute('tabindex', '0');
  });

  it('is a plain image, not a control, when fixed to the FM scenario', () => {
    const onPointerDown = vi.fn<() => void>();
    const { container } = render(
      <svg>
        <Ball x={12} y={34} scale={scale} fixed onPointerDown={onPointerDown} />
      </svg>,
    );
    expect(screen.queryByRole('button', { name: 'Ball' })).toBeNull();
    const ball = screen.getByRole('img', { name: 'Ball' });
    expect(ball).not.toHaveAttribute('tabindex');
    expect(ball.style.transform).toBe('translate(12px, 34px)');
    fireEvent.pointerDown(container.querySelector('circle')!);
    expect(onPointerDown).not.toHaveBeenCalled();
  });

  it('starts a drag from its own hit area when given a pointer handler', () => {
    const onPointerDown = vi.fn<() => void>();
    const { container } = render(
      <svg>
        <Ball x={12} y={34} scale={scale} onPointerDown={onPointerDown} />
      </svg>,
    );
    fireEvent.pointerDown(container.querySelector('circle')!);
    expect(onPointerDown).toHaveBeenCalledOnce();
  });

  it('passes key presses to its handler', () => {
    const onKeyDown = vi.fn<() => void>();
    render(
      <svg>
        <Ball x={0} y={0} scale={scale} onKeyDown={onKeyDown} />
      </svg>,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Ball' }), { key: 'ArrowLeft' });
    expect(onKeyDown).toHaveBeenCalledOnce();
  });

  it('sits at x and y and is sized at 72% of a token', () => {
    render(
      <svg>
        <Ball x={12} y={34} scale={scale} />
      </svg>,
    );
    const ball = screen.getByRole('button', { name: 'Ball' });
    expect(ball.style.transform).toBe('translate(12px, 34px)');
    expect(ball.querySelector('g')).toHaveAttribute('transform', `scale(${(16 * 0.72) / 8})`);
  });

  it('draws a halo when selected and takes its tooltip as a title', () => {
    const { container } = render(
      <svg>
        <Ball x={0} y={0} scale={scale} selected title="Ball. Drag it anywhere on the pitch." />
      </svg>,
    );
    expect(container.querySelector('.halo, [class*="halo"]')).not.toBeNull();
    expect(container.querySelector('title')).toHaveTextContent(
      'Ball. Drag it anywhere on the pitch.',
    );
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
