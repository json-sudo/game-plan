import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '.';

describe('Button', () => {
  it.each(['primary', 'ink', 'secondary', 'ghost'] as const)(
    'renders the %s variant',
    (variant) => {
      render(<Button variant={variant}>Done</Button>);
      expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('data-variant', variant);
    },
  );

  it('defaults to the secondary variant', () => {
    render(<Button>Export PNG</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary');
  });

  it('calls onClick', async () => {
    const onClick = vi.fn<() => void>();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('names an icon button by its label and tooltips the label', () => {
    render(<Button variant="icon" icon="save" label="Save" />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveTextContent('');
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Save');
  });

  it('keeps an explicit tooltip apart from the accessible name', () => {
    render(<Button variant="icon" icon="undo" label="Undo" tooltip="Undo zone change" />);
    const button = screen.getByRole('button', { name: 'Undo' });
    expect(button).toHaveAccessibleDescription('Undo zone change');
  });

  it('puts an icon before the text and grows it at the large size', () => {
    const { container, rerender } = render(
      <Button icon="share" variant="ink">
        Share tactic
      </Button>,
    );
    expect(container.querySelector('svg')).toHaveAttribute('width', '20');
    rerender(
      <Button icon="share" variant="ink" size="lg">
        Share tactic
      </Button>,
    );
    expect(container.querySelector('svg')).toHaveAttribute('width', '24');
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg');
  });

  it('reports a pressed state', () => {
    render(
      <Button variant="icon" icon="menu" label="Menu" pressed>
        Menu
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('plain disabled blocks clicks and focus', async () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button disabled onClick={onClick}>
        Plain disabled
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Plain disabled' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  describe('disabled with a reason', () => {
    const reason = 'Apply a formation or matchup first.';

    it('stays focusable and describes itself with the reason', async () => {
      const user = userEvent.setup();
      render(
        <Button variant="ghost" disabled disabledReason={reason}>
          Reset
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Reset' });
      expect(button).not.toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAccessibleDescription(reason);
      await user.tab();
      expect(button).toHaveFocus();
      expect(screen.getByRole('tooltip', { hidden: true }).parentElement).toHaveAttribute(
        'data-visible',
        'true',
      );
    });

    it('shows the reason on hover and does not run onClick or Enter', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn<() => void>();
      render(
        <Button variant="ghost" disabled disabledReason={reason} onClick={onClick}>
          Reset
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Reset' });
      await user.hover(button);
      expect(screen.getByRole('tooltip', { hidden: true }).parentElement).toHaveAttribute(
        'data-visible',
        'true',
      );
      await user.click(button);
      button.focus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('can show the reason in a preview', () => {
      render(
        <Button disabled disabledReason={reason} tipOpen tipPlacement="top">
          Back
        </Button>,
      );
      const wrapper = screen.getByRole('tooltip', { hidden: true }).parentElement!;
      expect(wrapper).toHaveAttribute('data-visible', 'true');
      expect(wrapper).toHaveAttribute('data-placement', 'top');
    });
  });
});
