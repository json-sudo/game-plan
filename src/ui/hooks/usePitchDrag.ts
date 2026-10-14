import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Point } from '../../data/types';
import { clampToPitch } from '../../engine';

export interface PitchDragHandlers {
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, point: Point) => void;
  onDragEnd?: (id: string, point: Point) => void;
  onDropOnBench?: (id: string) => void;
  onCancel?: (id: string) => void;
}

type DropTarget = { over: 'pitch'; point: Point } | { over: 'bench' } | { over: 'outside' };

export function clientToPitch(svg: SVGSVGElement, clientX: number, clientY: number): Point | null {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  return clampToPitch({
    x: (clientX - matrix.e) / matrix.a,
    y: (clientY - matrix.f) / matrix.d,
  });
}

function isInside(rect: DOMRect, clientX: number, clientY: number): boolean {
  return (
    clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  );
}

export function usePitchDrag(handlers: PitchDragHandlers) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const benchRef = useRef<HTMLElement | null>(null);
  const handlersRef = useRef(handlers);
  const stopRef = useRef<(() => void) | null>(null);
  const [overBench, setOverBench] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => () => stopRef.current?.(), []);

  const locate = (clientX: number, clientY: number): DropTarget => {
    const svg = svgRef.current;
    const bench = benchRef.current;
    if (bench && isInside(bench.getBoundingClientRect(), clientX, clientY)) {
      return { over: 'bench' };
    }
    if (svg && isInside(svg.getBoundingClientRect(), clientX, clientY)) {
      const point = clientToPitch(svg, clientX, clientY);
      if (point) return { over: 'pitch', point };
    }
    return { over: 'outside' };
  };

  const startDrag = (id: string) => (event: ReactPointerEvent) => {
    stopRef.current?.();
    handlersRef.current.onDragStart?.(id);

    const finish = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      stopRef.current = null;
      setOverBench(false);
    };
    const onMove = (move: PointerEvent) => {
      const target = locate(move.clientX, move.clientY);
      setOverBench(target.over === 'bench');
      const svg = svgRef.current;
      const point = svg ? clientToPitch(svg, move.clientX, move.clientY) : null;
      if (point) handlersRef.current.onDragMove?.(id, point);
    };
    const onUp = (up: PointerEvent) => {
      const target = locate(up.clientX, up.clientY);
      finish();
      if (target.over === 'pitch') handlersRef.current.onDragEnd?.(id, target.point);
      else if (target.over === 'bench') handlersRef.current.onDropOnBench?.(id);
      else handlersRef.current.onCancel?.(id);
    };
    const onCancel = () => {
      finish();
      handlersRef.current.onCancel?.(id);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    stopRef.current = finish;
    event.preventDefault();
  };

  return { svgRef, benchRef, overBench, startDrag };
}
