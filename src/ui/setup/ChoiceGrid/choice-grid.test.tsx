import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChoiceGrid } from '.';

const OPTIONS = [
  { label: '4-3-3 DM Wide' },
  { label: '4-2-3-1 DM Wide', sub: 'Two pivots' },
  { label: 'More', value: 'more' },
];

describe('ChoiceGrid', () => {
  it('shows the chosen option without interactive radios when display-only', () => {
    render(<ChoiceGrid label="My team" mark="mine" options={OPTIONS} value="4-3-3 DM Wide" />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText('My team')).toBeInTheDocument();
    const selected = screen.getByText('4-3-3 DM Wide').closest('[data-selected="true"]');
    expect(selected).toBeInTheDocument();
    expect(selected).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText(/4-2-3-1 DM Wide/).closest('[aria-current="true"]')).not.toBeInTheDocument();
  });

  it('shows sub text on a card', () => {
    render(<ChoiceGrid options={OPTIONS} />);
    expect(screen.getByText('Two pivots')).toBeInTheDocument();
  });

  it('uses the value when a card has one, else the label', async () => {
    const onChange = vi.fn<() => void>();
    render(<ChoiceGrid options={OPTIONS} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'More' }));
    expect(onChange).toHaveBeenLastCalledWith('more');
    await userEvent.click(screen.getByRole('radio', { name: '4-3-3 DM Wide' }));
    expect(onChange).toHaveBeenLastCalledWith('4-3-3 DM Wide');
  });

  it('moves between cards with the arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<() => void>();
    render(<ChoiceGrid options={OPTIONS} value="4-3-3 DM Wide" onChange={onChange} />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /4-2-3-1/ })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('4-2-3-1 DM Wide');
  });

  it('sets a fixed column count', () => {
    render(<ChoiceGrid options={OPTIONS} columns={2} />);
    expect(screen.getByRole('radiogroup')).toHaveStyle({
      gridTemplateColumns: 'repeat(2, 1fr)',
    });
  });

  it('renders without a label', () => {
    render(<ChoiceGrid options={OPTIONS} />);
    expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-labelledby');
  });
});
