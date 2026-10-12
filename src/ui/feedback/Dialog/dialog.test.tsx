import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '.';

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open save
      </button>
      {open ? (
        <Dialog
          title="Save tactic"
          footer={<button type="button">Save to slot 1</button>}
          onClose={() => {
            onClose?.();
            setOpen(false);
          }}
        >
          <input aria-label="Name" />
        </Dialog>
      ) : null}
    </>
  );
}

describe('Dialog', () => {
  it('is a modal dialog named by its title with body and footer', () => {
    render(
      <Dialog title="Share tactic" footer={<button type="button">Done</button>}>
        <p>Paste it in your group chat.</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Share tactic' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('heading', { name: 'Share tactic' })).toBeInTheDocument();
    expect(screen.getByText('Paste it in your group chat.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('omits the footer when there is none', () => {
    const { container } = render(<Dialog title="Load tactic">Body</Dialog>);
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });

  it('closes with Escape and the close button when onClose is omitted', async () => {
    const user = userEvent.setup();
    render(<Dialog title="Load tactic">Body</Dialog>);
    const dialog = screen.getByRole('dialog', { name: 'Load tactic' });
    expect(dialog).toHaveAttribute('open');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog).not.toHaveAttribute('open');
    render(<Dialog title="Share tactic">Body</Dialog>);
    const second = screen.getByRole('dialog', { name: 'Share tactic' });
    await user.keyboard('{Escape}');
    expect(second).not.toHaveAttribute('open');
  });

  it('closes from the close button', async () => {
    const onClose = vi.fn<() => void>();
    render(
      <Dialog title="Export PNG" onClose={onClose}>
        Body
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes with Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn<() => void>();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open save' });
    await user.click(opener);
    expect(screen.getByRole('dialog', { name: 'Save tactic' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('returns focus to the opener after the close button too', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open save' });
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(opener).toHaveFocus();
  });

  it('closes when the backdrop is pressed and released, not when a drag ends there', () => {
    const onClose = vi.fn<() => void>();
    render(
      <Dialog title="Save tactic" onClose={onClose}>
        <p>Body</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.pointerDown(screen.getByText('Body'));
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Body'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not report a close under StrictMode remounting', () => {
    const onClose = vi.fn<() => void>();
    render(
      <StrictMode>
        <Dialog title="Save tactic" onClose={onClose}>
          Body
        </Dialog>
      </StrictMode>,
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
  });

  it('renders without a modal when inline', () => {
    render(
      <Dialog inline title="Load tactic">
        Body
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Load tactic' });
    expect(dialog.tagName).toBe('DIV');
    expect(dialog).not.toHaveAttribute('aria-modal');
  });
});
