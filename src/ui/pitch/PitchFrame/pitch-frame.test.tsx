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

describe('PitchFrame inset', () => {
  function renderInset(attacking: Side) {
    const { container } = render(
      <PitchFrame attacking={attacking} mine="Harbour FC" opponent="Rovers" inset>
        <div data-testid="pitch" />
      </PitchFrame>,
    );
    return {
      frame: container.firstElementChild as HTMLElement,
      rows: screen.getAllByRole('group'),
    };
  }

  it('marks the frame as inset so the team labels sit inside the pitch corners', () => {
    const { frame } = renderInset('mine');
    expect(frame).toHaveAttribute('data-inset', 'true');
  });

  it('keeps the same top and bottom labels as the rows above and below the pitch', () => {
    const { rows } = renderInset('mine');
    expect(rows[0]!.textContent).toContain('Rovers');
    expect(rows[1]!.textContent).toContain('Harbour FC');
    expect(rows[1]!.textContent).toContain('Attacking ↑');
  });

  it('places the corner labels around the pitch, not as sibling rows', () => {
    const { frame } = renderInset('opponent');
    const pitch = screen.getByTestId('pitch');
    expect(frame.firstElementChild).toBe(pitch);
  });
});

describe('PitchFrame solo and notice', () => {
  it('shows only the attacking row and no Defending label when solo', () => {
    render(
      <PitchFrame attacking="mine" mine="Harbour FC" opponent="Rovers" solo>
        <div data-testid="pitch" />
      </PitchFrame>,
    );
    expect(screen.getAllByRole('group')).toHaveLength(1);
    expect(screen.queryByText('Rovers')).toBeNull();
    expect(screen.queryByText('Defending')).toBeNull();
    expect(screen.getByText('Attacking ↑')).toBeInTheDocument();
  });

  it('keeps a single label when solo and inset', () => {
    render(
      <PitchFrame attacking="mine" mine="Harbour FC" opponent="Rovers" solo inset>
        <div data-testid="pitch" />
      </PitchFrame>,
    );
    expect(screen.getAllByRole('group')).toHaveLength(1);
    expect(screen.queryByText('Defending')).toBeNull();
  });

  it('renders the notice as a plate over the pitch', () => {
    render(
      <PitchFrame attacking="mine" mine="Harbour FC" opponent="Rovers" notice="Pick a zone">
        <div data-testid="pitch" />
      </PitchFrame>,
    );
    expect(screen.getByText('Pick a zone')).toBeInTheDocument();
  });
});
