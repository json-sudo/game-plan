import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SlotListItem } from '.';

describe('SlotListItem', () => {
  it('names a filled slot by number, name and when it was saved', () => {
    render(<SlotListItem slot={1} name="Gegenpress 4-3-3" meta="FM mode · saved 10 Oct, 21:14" />);
    expect(
      screen.getByRole('button', {
        name: 'Slot 1: Gegenpress 4-3-3 FM mode · saved 10 Oct, 21:14',
      }),
    ).toBeInTheDocument();
  });

  it('shows the default empty label and a custom one', () => {
    const { rerender } = render(<SlotListItem slot={2} empty meta="Nothing saved yet" />);
    expect(screen.getByRole('button', { name: /Slot 2: Empty slot/ })).toBeInTheDocument();
    rerender(<SlotListItem slot={2} empty emptyLabel="Save here" />);
    expect(screen.getByRole('button', { name: 'Slot 2: Save here' })).toBeInTheDocument();
  });

  it('reports its chosen state', () => {
    const { rerender } = render(<SlotListItem slot={1} name="A" selected />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    rerender(<SlotListItem slot={1} name="A" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onClick', async () => {
    const onClick = vi.fn<() => void>();
    render(<SlotListItem slot={1} name="A" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps trailing controls beside the slot button, not inside it', async () => {
    const onClick = vi.fn<() => void>();
    const onRename = vi.fn<() => void>();
    render(
      <SlotListItem
        slot={1}
        name="A"
        onClick={onClick}
        trailing={
          <button type="button" onClick={onRename}>
            Rename
          </button>
        }
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Slot 1/ })).not.toContainElement(
      screen.getByRole('button', { name: 'Rename' }),
    );
  });
});
