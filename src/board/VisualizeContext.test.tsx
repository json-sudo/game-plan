import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { VisualizeProvider, useVisualize } from './VisualizeContext';

function wrapper({ children }: { children: ReactNode }) {
  return <VisualizeProvider>{children}</VisualizeProvider>;
}

describe('VisualizeContext', () => {
  it('starts inactive with no selections', () => {
    const { result } = renderHook(() => useVisualize(), { wrapper });
    expect(result.current.active).toBe(false);
    expect(result.current.carrierId).toBeNull();
    expect(result.current.action).toBeNull();
  });

  it('start() activates the flow for the given attacker with no carrier chosen yet', () => {
    const { result } = renderHook(() => useVisualize(), { wrapper });
    act(() => result.current.start('mine'));
    expect(result.current.active).toBe(true);
    expect(result.current.attacker).toBe('mine');
    expect(result.current.carrierId).toBeNull();
  });

  it('selectAction is a no-op until a carrier has been selected', () => {
    const { result } = renderHook(() => useVisualize(), { wrapper });
    act(() => result.current.start('mine'));
    act(() => result.current.selectAction('dribble'));
    expect(result.current.action).toBeNull();
  });

  it('selectCarrier designates the carrier, after which selectAction takes effect', () => {
    const { result } = renderHook(() => useVisualize(), { wrapper });
    act(() => result.current.start('mine'));
    act(() => result.current.selectCarrier('mine-9'));
    expect(result.current.carrierId).toBe('mine-9');
    act(() => result.current.selectAction('pass'));
    expect(result.current.action).toBe('pass');
  });

  it('choosing a new carrier resets any in-progress action, pass target and dribble direction', () => {
    const { result } = renderHook(() => useVisualize(), { wrapper });
    act(() => result.current.start('mine'));
    act(() => result.current.selectCarrier('mine-9'));
    act(() => result.current.selectAction('pass'));
    act(() => result.current.selectPassTarget('mine-8'));
    act(() => result.current.selectCarrier('mine-8'));
    expect(result.current.carrierId).toBe('mine-8');
    expect(result.current.action).toBeNull();
    expect(result.current.passTargetId).toBeNull();
  });

  it('choosing a different action clears a previously chosen pass target / dribble direction', () => {
    const { result } = renderHook(() => useVisualize(), { wrapper });
    act(() => result.current.start('mine'));
    act(() => result.current.selectCarrier('mine-9'));
    act(() => result.current.selectAction('dribble'));
    act(() => result.current.selectDribbleDirection('forward'));
    expect(result.current.dribbleDirection).toBe('forward');
    act(() => result.current.selectAction('pass'));
    expect(result.current.dribbleDirection).toBeNull();
    expect(result.current.passTargetId).toBeNull();
  });

  it('stop() resets the whole flow back to inactive', () => {
    const { result } = renderHook(() => useVisualize(), { wrapper });
    act(() => result.current.start('mine'));
    act(() => result.current.selectCarrier('mine-9'));
    act(() => result.current.selectAction('dribble'));
    act(() => result.current.stop());
    expect(result.current.active).toBe(false);
    expect(result.current.carrierId).toBeNull();
    expect(result.current.action).toBeNull();
  });
});
