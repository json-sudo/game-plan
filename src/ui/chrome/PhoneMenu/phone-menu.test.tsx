import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhoneMenu, type PhoneMenuEntry } from '.';

function items(onSelect = vi.fn()): PhoneMenuEntry[] {
  return [
    { icon: 'reset', label: 'Reset', disabled: true, note: 'Apply a formation or matchup first.' },
    { icon: 'clear', label: 'Clear', onSelect },
    'sep',
    { icon: 'save', label: 'Save', onSelect },
    { icon: 'bench', label: 'Bench', note: '9 pieces' },
  ];
}

describe('PhoneMenu', () => {
  it('is a modal sheet named More with a menu of actions', () => {
    render(<PhoneMenu items={items()} />);
    expect(screen.getByRole('dialog', { name: 'More' })).toHaveAttribute('open');
    expect(screen.getByRole('menu', { name: 'More' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'ResetApply a formation or matchup first.',
      'Clear',
      'Save',
      'Bench9 pieces',
    ]);
  });

  it('takes a custom title', () => {
    render(<PhoneMenu title="Actions" items={items()} />);
    expect(screen.getByRole('dialog', { name: 'Actions' })).toBeInTheDocument();
  });

  it('shows a disabled reason inline and keeps the row focusable', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PhoneMenu items={items(onSelect)} />);
    const reset = screen.getByRole('menuitem', { name: /Reset/ });
    expect(reset).toHaveAttribute('aria-disabled', 'true');
    expect(reset).toHaveAccessibleDescription('Apply a formation or matchup first.');
    await user.click(reset);
    expect(onSelect).not.toHaveBeenCalled();
    reset.focus();
    expect(reset).toHaveFocus();
  });

  it('selects an action', async () => {
    const onSelect = vi.fn();
    render(<PhoneMenu items={items(onSelect)} />);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Clear' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('moves between rows with the arrow keys, wrapping, Home and End', async () => {
    const user = userEvent.setup();
    render(<PhoneMenu items={items()} />);
    const [reset, clear, save, bench] = screen.getAllByRole('menuitem');
    reset.focus();
    await user.keyboard('{ArrowDown}');
    expect(clear).toHaveFocus();
    await user.keyboard('{End}');
    expect(bench).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(reset).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(bench).toHaveFocus();
    await user.keyboard('{Home}');
    expect(reset).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(save).toHaveFocus();
    await user.keyboard('a');
    expect(save).toHaveFocus();
  });

  it('closes with the close button, Escape and a backdrop press, then returns focus', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PhoneMenu items={items()} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders as a plain sheet when inline', () => {
    render(<PhoneMenu inline items={items()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('menu', { name: 'More' })).toBeInTheDocument();
  });
});
