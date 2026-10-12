import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UndoControl } from '.';

describe('UndoControl', () => {
  it('is a History group with Undo and Redo', () => {
    render(<UndoControl canUndo canRedo />);
    const group = screen.getByRole('group', { name: 'History' });
    expect(group).toContainElement(screen.getByRole('button', { name: 'Undo' }));
    expect(group).toContainElement(screen.getByRole('button', { name: 'Redo' }));
  });

  it('explains why Undo and Redo are disabled and keeps them focusable', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<UndoControl onUndo={onUndo} />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    const redo = screen.getByRole('button', { name: 'Redo' });
    expect(undo).toHaveAccessibleDescription('Nothing to undo yet.');
    expect(redo).toHaveAccessibleDescription('Nothing to redo.');
    await user.tab();
    expect(undo).toHaveFocus();
    await user.click(undo);
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('runs the callbacks when enabled', async () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(<UndoControl canUndo canRedo onUndo={onUndo} onRedo={onRedo} />);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('describes the next undo step', () => {
    render(<UndoControl canUndo undoLabel="Undo zone change" />);
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAccessibleDescription(
      'Undo zone change',
    );
  });

  it('hides Redo when it is cut', () => {
    render(<UndoControl canUndo redo={false} />);
    expect(screen.queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument();
  });
});
