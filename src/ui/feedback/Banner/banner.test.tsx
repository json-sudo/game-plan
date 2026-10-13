import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Banner } from '.';

describe('Banner', () => {
  it('announces an error as an alert', () => {
    render(
      <Banner tone="error" title="This share link could not be opened.">
        It may be cut short or changed. Your pitch has not changed.
      </Banner>,
    );
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('This share link could not be opened.');
    expect(banner).toHaveTextContent('Your pitch has not changed.');
    expect(banner).toHaveAttribute('data-tone', 'error');
  });

  it('announces info politely as a status and defaults to info', () => {
    render(<Banner title="Saving is off in this browser." />);
    expect(screen.getByRole('status')).toHaveAttribute('data-tone', 'info');
  });

  it('draws a different icon per tone', () => {
    const { container, rerender } = render(<Banner tone="error" title="Oops" />);
    const errorPaths = container.querySelector('svg')!.innerHTML;
    rerender(<Banner tone="info" title="Oops" />);
    expect(container.querySelector('svg')!.innerHTML).not.toBe(errorPaths);
  });

  it('renders actions', () => {
    render(<Banner title="Skipped" actions={<button type="button">Learn more</button>} />);
    expect(screen.getByRole('button', { name: 'Learn more' })).toBeInTheDocument();
  });

  it('shows no dismiss button unless asked', () => {
    render(<Banner title="Skipped" />);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });

  it('shows a dismiss button only when given a handler', async () => {
    const onDismiss = vi.fn<() => void>();
    const { rerender } = render(<Banner title="Skipped" />);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    rerender(<Banner title="Skipped" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
