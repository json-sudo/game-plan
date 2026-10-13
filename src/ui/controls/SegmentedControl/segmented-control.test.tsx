import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from '.';

const OPTIONS = [
  { value: '11', label: '11' },
  { value: '20', label: '20' },
  { value: '26', label: '26' },
];

function Controlled({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('20');
  return (
    <SegmentedControl
      label="Squad size"
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('SegmentedControl', () => {
  it('shows the chosen label as static text when display-only', () => {
    render(<SegmentedControl label="Squad size" options={OPTIONS} value="20" />);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('shows the label above the group when asked', () => {
    const onChange = vi.fn<() => void>();
    render(
      <SegmentedControl label="Arrows" showLabel options={OPTIONS} value="11" onChange={onChange} />,
    );
    expect(screen.getByText('Arrows')).toBeVisible();
    expect(screen.getByRole('radiogroup', { name: 'Arrows' })).toBeInTheDocument();
  });

  it('reports a clicked option', async () => {
    const onChange = vi.fn<() => void>();
    render(
      <SegmentedControl label="Squad size" options={OPTIONS} value="20" onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('radio', { name: '26' }));
    expect(onChange).toHaveBeenCalledWith('26');
  });

  it('tabs onto the chosen option only', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.tab();
    expect(screen.getByRole('radio', { name: '20' })).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('moves and selects with the arrow keys, wrapping at both ends', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<() => void>();
    render(<Controlled onChange={onChange} />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '26' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: '26' })).toBeChecked();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '11' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: '26' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('26');
  });

  it('jumps to the first and last option with Home and End', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.tab();
    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: '26' })).toBeChecked();
    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: '11' })).toBeChecked();
  });

  it('lets the first option take the tab stop when nothing is chosen', async () => {
    const user = userEvent.setup();
    render(<SegmentedControl label="Mode" options={OPTIONS} />);
    await user.tab();
    expect(screen.getByRole('radio', { name: '11' })).toHaveFocus();
  });

  it('tracks roving focus and selection when uncontrolled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<() => void>();
    render(<SegmentedControl label="Mode" options={OPTIONS} onChange={onChange} />);
    await user.tab();
    expect(screen.getByRole('radio', { name: '11' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: '11' })).not.toBeChecked();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '20' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: '20' })).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith('20');
    await user.tab();
    expect(document.body).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('radio', { name: '20' })).toHaveFocus();
  });

  it('ignores other keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<() => void>();
    render(<SegmentedControl label="Mode" options={OPTIONS} value="20" onChange={onChange} />);
    await user.tab();
    await user.keyboard('a');
    expect(onChange).not.toHaveBeenCalled();
  });
});
