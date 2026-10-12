import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from '.';

function Controlled({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <TextField
      label="Piece name"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe('TextField', () => {
  it('labels the input and shows a mono counter', () => {
    render(<TextField label="Piece name" value="Saka" />);
    expect(screen.getByRole('textbox', { name: 'Piece name' })).toHaveValue('Saka');
    expect(screen.getByText('4/24')).toBeInTheDocument();
  });

  it('keeps a hidden label for assistive tech', () => {
    render(<TextField label="My team name" hideLabel value="Arsenal" />);
    expect(screen.getByRole('textbox', { name: 'My team name' })).toBeInTheDocument();
    expect(screen.getByText('My team name')).toHaveAttribute('data-hidden', 'true');
  });

  it('hides the counter on request and for the team variant', () => {
    const { rerender } = render(<TextField label="Name" value="abc" counter={false} />);
    expect(screen.queryByText('3/24')).not.toBeInTheDocument();
    rerender(<TextField label="Name" value="abc" variant="team" />);
    expect(screen.queryByText('3/24')).not.toBeInTheDocument();
    rerender(<TextField label="Name" value="abc" variant="team" counter />);
    expect(screen.getByText('3/24')).toBeInTheDocument();
  });

  it('describes the field with its hint', () => {
    render(<TextField label="Piece name" hint="Shows on the token and in the bench." />);
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
      'Shows on the token and in the bench.',
    );
  });

  it('flags an explicit error', () => {
    render(<TextField label="Piece name" error="24 characters at most." value="x" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('24 characters at most.');
  });

  it('refuses input beyond the cap and says so', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'abcdefghijklmnopqrstuvwxyz');
    expect(input).toHaveValue('abcdefghijklmnopqrstuvwx');
    expect(screen.getByText('24/24')).toBeInTheDocument();
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('24 characters at most.');
  });

  it('honours a custom cap', () => {
    render(<TextField label="Name" value="abcde" maxLength={5} />);
    expect(screen.getByText('5/5')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('5 characters at most.');
  });

  it('does not call a read-only field full', () => {
    render(<TextField label="Link" value={'x'.repeat(24)} readOnly />);
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    expect(screen.getByRole('textbox')).toBeValid();
  });

  it('passes typed text to onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.type(screen.getByRole('textbox'), 'ab');
    expect(onChange).toHaveBeenNthCalledWith(1, 'a');
    expect(onChange).toHaveBeenNthCalledWith(2, 'ab');
  });

  it('takes a width and a placeholder', () => {
    const { container } = render(<TextField label="Name" placeholder="Sub 14" width={220} />);
    expect(screen.getByPlaceholderText('Sub 14')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveStyle({ width: '220px' });
  });
});
