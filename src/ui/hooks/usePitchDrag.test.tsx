import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Point } from '../../data/types';
import { Bench } from '../bench/Bench';
import { Pitch } from '../pitch/Pitch';
import { PlayerToken } from '../pitch/PlayerToken';
import { clientToPitch, usePitchDrag } from './usePitchDrag';

function stubSvg(svg: Element, scale: number, left = 0, top = 0) {
  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({ a: scale, b: 0, c: 0, d: scale, e: left, f: top }),
  });
  svg.getBoundingClientRect = () =>
    ({
      left,
      top,
      right: left + 76.19 * scale,
      bottom: top + 100 * scale,
      width: 76.19 * scale,
      height: 100 * scale,
    }) as DOMRect;
}

function stubRect(node: Element, rect: Partial<DOMRect>) {
  node.getBoundingClientRect = () => ({ ...rect }) as DOMRect;
}

describe('clientToPitch', () => {
  const svgAt = (scale: number, left: number, top: number) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    stubSvg(svg, scale, left, top);
    return svg;
  };

  it('converts client coordinates to pitch units at two rendered sizes', () => {
    expect(clientToPitch(svgAt(2, 10, 20), 10 + 2 * 30, 20 + 2 * 40)).toEqual({ x: 30, y: 40 });
    expect(clientToPitch(svgAt(5, 100, 50), 100 + 5 * 30, 50 + 5 * 40)).toEqual({ x: 30, y: 40 });
  });

  it('clamps to the pitch edges', () => {
    const svg = svgAt(2, 0, 0);
    expect(clientToPitch(svg, -50, -50)).toEqual({ x: 0, y: 0 });
    expect(clientToPitch(svg, 9999, 9999)).toEqual({ x: 76.19, y: 100 });
  });

  it('returns null without a screen matrix', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.defineProperty(svg, 'getScreenCTM', { value: () => null });
    expect(clientToPitch(svg, 1, 1)).toBeNull();
  });
});

const handlers = {
  onDragStart: vi.fn<(id: string) => void>(),
  onDragMove: vi.fn<(id: string, point: Point) => void>(),
  onDragEnd: vi.fn<(id: string, point: Point) => void>(),
  onDropOnBench: vi.fn<(id: string) => void>(),
  onCancel: vi.fn<(id: string) => void>(),
};

function Harness({ scale = 2 }: { scale?: number }) {
  const drag = usePitchDrag(handlers);
  return (
    <>
      <Pitch
        label="Pitch"
        svgRef={(node) => {
          drag.svgRef.current = node;
          if (node) stubSvg(node, scale);
        }}
      >
        <PlayerToken x={10} y={10} label="9" onPointerDown={drag.startDrag('p1')} />
      </Pitch>
      <Bench
        pieces={[{ id: 'b1', label: 'Sub 14', team: 'mine' }]}
        placed={1}
        dropping={drag.overBench}
        benchRef={(node) => {
          drag.benchRef.current = node;
          if (node) stubRect(node, { left: 500, right: 700, top: 0, bottom: 300 });
        }}
        onChipPointerDown={drag.startDrag}
      />
    </>
  );
}

const dropZone = () => document.querySelector('[class*="drop"]');
const token = () => screen.getByRole('button', { name: /^9/ });

afterEach(() => vi.clearAllMocks());

describe('usePitchDrag', () => {
  it('reports start, move and end for a token with its id, in pitch units', () => {
    render(<Harness />);
    fireEvent.pointerDown(token(), { clientX: 20, clientY: 20 });
    expect(handlers.onDragStart).toHaveBeenCalledWith('p1');
    fireEvent.pointerMove(window, { clientX: 60, clientY: 80 });
    expect(handlers.onDragMove).toHaveBeenLastCalledWith('p1', { x: 30, y: 40 });
    fireEvent.pointerUp(window, { clientX: 60, clientY: 80 });
    expect(handlers.onDragEnd).toHaveBeenCalledWith('p1', { x: 30, y: 40 });
    expect(handlers.onCancel).not.toHaveBeenCalled();
  });

  it('reports pitch units independent of the rendered size', () => {
    render(<Harness scale={4} />);
    fireEvent.pointerDown(token(), { clientX: 1, clientY: 1 });
    fireEvent.pointerUp(window, { clientX: 60, clientY: 80 });
    expect(handlers.onDragEnd).toHaveBeenCalledWith('p1', { x: 15, y: 20 });
  });

  it('cancels and does not end when released outside the pitch and bench', () => {
    render(<Harness />);
    fireEvent.pointerDown(token(), { clientX: 1, clientY: 1 });
    fireEvent.pointerUp(window, { clientX: 400, clientY: 400 });
    expect(handlers.onCancel).toHaveBeenCalledWith('p1');
    expect(handlers.onDragEnd).not.toHaveBeenCalled();
    expect(handlers.onDropOnBench).not.toHaveBeenCalled();
  });

  it('cancels on pointercancel and stops tracking afterwards', () => {
    render(<Harness />);
    fireEvent.pointerDown(token(), { clientX: 1, clientY: 1 });
    fireEvent.pointerCancel(window);
    expect(handlers.onCancel).toHaveBeenCalledWith('p1');
    fireEvent.pointerMove(window, { clientX: 20, clientY: 20 });
    expect(handlers.onDragMove).not.toHaveBeenCalled();
  });

  it('reports a bench chip dropped on the pitch with the chip id', () => {
    render(<Harness />);
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Sub 14/ }), {
      clientX: 600,
      clientY: 10,
    });
    expect(handlers.onDragStart).toHaveBeenCalledWith('b1');
    fireEvent.pointerMove(window, { clientX: 60, clientY: 80 });
    fireEvent.pointerUp(window, { clientX: 60, clientY: 80 });
    expect(handlers.onDragEnd).toHaveBeenCalledWith('b1', { x: 30, y: 40 });
  });

  it('sets over-bench while a token is over the bench and drops on the bench', () => {
    render(<Harness />);
    expect(dropZone()).toBeNull();
    fireEvent.pointerDown(token(), { clientX: 1, clientY: 1 });
    fireEvent.pointerMove(window, { clientX: 600, clientY: 100 });
    expect(dropZone()).not.toBeNull();
    fireEvent.pointerUp(window, { clientX: 600, clientY: 100 });
    expect(handlers.onDropOnBench).toHaveBeenCalledWith('p1');
    expect(handlers.onDragEnd).not.toHaveBeenCalled();
    expect(dropZone()).toBeNull();
  });

  it('clears over-bench when the token leaves the bench', () => {
    render(<Harness />);
    fireEvent.pointerDown(token(), { clientX: 1, clientY: 1 });
    fireEvent.pointerMove(window, { clientX: 600, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 60, clientY: 80 });
    expect(dropZone()).toBeNull();
  });
});
