import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('drops brackets from the label on the pitch but keeps the FM form in the accessible name', () => {
    renderToken({ label: 'AM(L)' });
    expect(screen.getByText('AML')).toBeInTheDocument();
    expect(screen.queryByText('AM(L)')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAccessibleName(expect.stringContaining('AM(L)'));
  });

  it('sizes the body from the token size in pixels', () => {
    const small = renderToken({ scale: { ppu: 8, tokenPx: 26, hitPx: 40 } });
    const smallR = Number(
      small.container.querySelector('circle[data-part="body"]')!.getAttribute('r'),
    );
    small.unmount();
    const large = renderToken({ scale: { ppu: 8, tokenPx: 34, hitPx: 40 } });
    const largeR = Number(
      large.container.querySelector('circle[data-part="body"]')!.getAttribute('r'),
    );
    expect(smallR).toBeCloseTo(13 / 8);
    expect(largeR).toBeCloseTo(17 / 8);
  });

  it('shows its tooltip as a title for hover', () => {
    renderToken({ label: 'AM(L)', title: 'AM(L) · Inside Forward' });
    expect(screen.getByText('AM(L) · Inside Forward', { selector: 'title' })).toBeInTheDocument();
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

  it('passes key presses to its handler so a piece can be moved from the keyboard', () => {
    const onKeyDown = vi.fn<() => void>();
    renderToken({ onKeyDown });
    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowLeft' });
    expect(onKeyDown).toHaveBeenCalledOnce();
  });
});

describe('PlayerToken fixed', () => {
  it('is a plain image that cannot be focused, pressed or dragged', () => {
    const onPointerDown = vi.fn<() => void>();
    const onKeyDown = vi.fn<() => void>();
    renderToken({ fixed: true, role: 'Winger', onPointerDown, onKeyDown });
    expect(screen.queryByRole('button')).toBeNull();
    const token = screen.getByRole('img', { name: /DM, Winger/ });
    expect(token).not.toHaveAttribute('tabindex');
    expect(token).not.toHaveAttribute('aria-pressed');
    fireEvent.pointerDown(token);
    fireEvent.keyDown(token, { key: 'Enter' });
    expect(onPointerDown).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(token).toHaveAttribute('data-fixed', 'true');
  });

  it('truncates a long custom name, keeps the role in the tooltip and the full name accessible', () => {
    renderToken({ fixed: true, role: 'Winger', name: FULL_NAME, title: 'DM · Winger' });
    const token = screen.getByRole('img', { name: new RegExp(FULL_NAME) });
    expect(screen.getByText('Abcdefghijkl…')).toBeInTheDocument();
    expect(token.querySelector('title')).toHaveTextContent('DM · Winger');
  });

  it('attaches no pointer, click or key handlers to the token element', () => {
    const { container } = renderToken({ fixed: true, onPointerDown: vi.fn<() => void>() });
    const token = container.querySelector('g[data-fixed]')!;
    const reactProps = Object.keys(token).find((key) => key.startsWith('__reactProps'))!;
    const props = (token as unknown as Record<string, Record<string, unknown>>)[reactProps];
    expect(props.onPointerDown).toBeUndefined();
    expect(props.onClick).toBeUndefined();
    expect(props.onKeyDown).toBeUndefined();
  });
});
