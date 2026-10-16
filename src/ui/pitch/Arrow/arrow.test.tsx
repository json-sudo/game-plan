import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Arrow, type ArrowProps } from '.';

function renderArrow(props: Partial<ArrowProps> = {}) {
  return render(
    <svg>
      <Arrow from={{ x: 10, y: 60 }} to={{ x: 10, y: 30 }} {...props} />
    </svg>,
  );
}

describe('Arrow', () => {
  it('is decorative', () => {
    const { container } = renderArrow();
    expect(container.querySelector('svg > g')).toHaveAttribute('aria-hidden', 'true');
  });

  it('ends at a 2.9-unit target ring at the target', () => {
    const { container } = renderArrow();
    const ring = container.querySelector('circle')!;
    expect(ring).toHaveAttribute('r', '2.9');
    expect(ring).toHaveAttribute('cx', '10');
    expect(ring).toHaveAttribute('cy', '30');
  });

  it('is solid for my team and dashed for the opponent', () => {
    const mine = renderArrow({ team: 'mine' });
    expect(mine.container.querySelector('svg > g')).toHaveAttribute('data-team', 'mine');
    expect(mine.container.querySelector('line')).not.toBeNull();
    mine.unmount();
    const opp = renderArrow({ team: 'opponent' });
    expect(opp.container.querySelector('svg > g')).toHaveAttribute('data-team', 'opponent');
  });

  it('dims to 35%', () => {
    const { container } = renderArrow({ dim: true });
    expect(container.querySelector('svg > g')).toHaveAttribute('data-dim', 'true');
  });

  it('draws no ring with ring false', () => {
    const { container } = renderArrow({ ring: false });
    expect(container.querySelector('circle')).toBeNull();
    expect(container.querySelector('line')).not.toBeNull();
  });

  it('draws no shaft when the target is too close', () => {
    const { container } = renderArrow({ to: { x: 10, y: 58 } });
    expect(container.querySelector('line')).toBeNull();
    expect(container.querySelector('circle')).not.toBeNull();
  });

  it('sizes the target ring and the start gap from the piece scale', () => {
    const { container } = render(
      <svg>
        <Arrow
          from={{ x: 10, y: 60 }}
          to={{ x: 10, y: 30 }}
          scale={{ ppu: 8, tokenPx: 32, hitPx: 40 }}
        />
      </svg>,
    );
    expect(container.querySelector('circle')).toHaveAttribute('r', String(2 + 2 / 8));
    expect(container.querySelector('line')).toHaveAttribute('y1', String(60 - (2 + 4 / 8)));
  });
});
