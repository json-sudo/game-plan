import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Side } from '../../../data/types';
import { PitchFrame } from '.';

function renderFrame(attacking: Side) {
  render(
    <PitchFrame attacking={attacking} mine="Harbour FC" opponent="Rovers">
      <div data-testid="pitch" />
    </PitchFrame>,
  );
  const rows = screen.getAllByRole('group');
  return { top: rows[0]!, bottom: rows[1]! };
}

describe('PitchFrame', () => {
  it('puts my team at the bottom with the tag when mine attacks', () => {
    const { top, bottom } = renderFrame('mine');
    expect(bottom.textContent).toContain('Harbour FC');
    expect(bottom.textContent).toContain('Attacking ↑');
    expect(top.textContent).toContain('Rovers');
    expect(top.textContent).not.toContain('Attacking');
  });

  it('puts the opponent at the bottom with the tag when the opponent attacks', () => {
    const { top, bottom } = renderFrame('opponent');
    expect(bottom.textContent).toContain('Rovers');
    expect(bottom.textContent).toContain('Attacking ↑');
    expect(top.textContent).toContain('Harbour FC');
  });

  it('renders the pitch between the rows', () => {
    renderFrame('mine');
    const rows = screen.getAllByRole('group');
    const pitch = screen.getByTestId('pitch');
    expect(rows[0]!.compareDocumentPosition(pitch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rows[1]!.compareDocumentPosition(pitch) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('marks my team with a circle and the opponent with a rounded square', () => {
    const { top, bottom } = renderFrame('mine');
    expect(bottom.querySelector('[data-mark="circle"]')).not.toBeNull();
    expect(top.querySelector('[data-mark="square"]')).not.toBeNull();
  });
});
