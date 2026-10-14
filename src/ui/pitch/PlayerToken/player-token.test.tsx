import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerToken, type PlayerTokenProps } from '.';

const FULL_NAME = 'Abcdefghijklmnopqrstuvwx';

function renderToken(props: Partial<PlayerTokenProps> = {}) {
  return render(
    <svg>
      <PlayerToken x={10} y={20} label="DM" {...props} />
    </svg>,
  );
}

describe('PlayerToken', () => {
  it('names itself with label, side, role and the full piece name while showing 12 characters and an ellipsis', () => {
    renderToken({ side: 'left', role: 'Screening DM', name: FULL_NAME });
    const token = screen.getByRole('button');
    expect(token).toHaveAccessibleName(expect.stringContaining('DM, left side, Screening DM'));
    expect(token).toHaveAccessibleName(expect.stringContaining(FULL_NAME));
    expect(screen.getByText('Abcdefghijkl…')).toBeInTheDocument();
    expect(screen.queryByText(FULL_NAME)).not.toBeInTheDocument();
  });

  it('shows a short name whole', () => {
    renderToken({ name: 'Rodri' });
    expect(screen.getByText('Rodri')).toBeInTheDocument();
  });

  it('draws my team as a circle and the opponent as a rounded square', () => {
    const mine = renderToken({ team: 'mine' });
    expect(mine.container.querySelector('circle[data-part="body"]')).not.toBeNull();
    expect(mine.container.querySelector('rect[data-part="body"]')).toBeNull();
    mine.unmount();
    const opp = renderToken({ team: 'opponent' });
    expect(opp.container.querySelector('rect[data-part="body"]')).not.toBeNull();
    expect(opp.container.querySelector('circle[data-part="body"]')).toBeNull();
  });

  it('marks the opponent in the accessible name', () => {
    renderToken({ team: 'opponent' });
    expect(screen.getByRole('button')).toHaveAccessibleName(expect.stringContaining('opponent'));
  });

  it('reads GK for a keeper', () => {
    renderToken({ keeper: true, label: undefined });
    expect(screen.getByText('GK')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('data-keeper', 'true');
  });

  it('shows the role plate only with showRole', () => {
    const hidden = renderToken({ role: 'Anchor' });
    expect(screen.queryByText('Anchor')).not.toBeInTheDocument();
    hidden.unmount();
    renderToken({ role: 'Anchor', showRole: true });
    expect(screen.getByText('Anchor')).toBeInTheDocument();
  });

  it('splits a long role name over two lines', () => {
    renderToken({ role: 'Ball Playing Defender', showRole: true });
    expect(screen.getByText('Ball Playing')).toBeInTheDocument();
    expect(screen.getByText('Defender')).toBeInTheDocument();
  });

  it('drops brackets from labels on the phone', () => {
    const desktop = renderToken({ label: 'AM(L)' });
    expect(screen.getByText('AM(L)')).toBeInTheDocument();
    desktop.unmount();
    renderToken({ label: 'AM(L)', phone: true });
    expect(screen.getByText('AML')).toBeInTheDocument();
    expect(screen.queryByText('AM(L)')).not.toBeInTheDocument();
  });

  it('uses the larger phone size', () => {
    const desktop = renderToken();
    const desktopR = desktop.container.querySelector('circle[data-part="body"]')!.getAttribute('r');
    desktop.unmount();
    const phone = renderToken({ phone: true });
    const phoneR = phone.container.querySelector('circle[data-part="body"]')!.getAttribute('r');
    expect(Number(phoneR)).toBeGreaterThan(Number(desktopR));
  });

  it('shows the selected halo and pressed state', () => {
    const idle = renderToken();
    expect(idle.container.querySelector('[data-part="halo"]')).toBeNull();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    idle.unmount();
    const selected = renderToken({ selected: true });
    expect(selected.container.querySelector('[data-part="halo"]')).not.toBeNull();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('scales up while dragging', () => {
    renderToken({ x: 10, y: 20, dragging: true });
    const token = screen.getByRole('button');
    expect(token.style.transform).toBe('translate(10px, 20px) scale(1.15)');
    expect(token).toHaveAttribute('data-dragging', 'true');
  });

  it('flags the ghost state', () => {
    renderToken({ ghost: true });
    expect(screen.getByRole('button')).toHaveAttribute('data-ghost', 'true');
  });
});
