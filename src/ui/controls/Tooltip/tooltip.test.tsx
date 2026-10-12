import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tooltip } from '.';

function wrap() {
  return screen.getByRole('tooltip', { hidden: true }).parentElement!;
}

describe('Tooltip', () => {
  it('renders its label as a tooltip beside the trigger', () => {
    render(
      <Tooltip label="Already at Final." id="tip">
        <button type="button">Next</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Already at Final.');
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveAttribute('id', 'tip');
    expect(wrap()).toHaveAttribute('data-visible', 'false');
  });

  it('opens on hover and closes when the pointer leaves', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Hint">
        <button type="button">Go</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button'));
    expect(wrap()).toHaveAttribute('data-visible', 'true');
    await user.unhover(screen.getByRole('button'));
    expect(wrap()).toHaveAttribute('data-visible', 'false');
  });

  it('opens on keyboard focus and closes on blur', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Hint">
        <button type="button">Go</button>
      </Tooltip>,
    );
    await user.tab();
    expect(wrap()).toHaveAttribute('data-visible', 'true');
    await user.tab();
    expect(wrap()).toHaveAttribute('data-visible', 'false');
  });

  it('can be forced open and takes its placement', () => {
    render(
      <Tooltip label="Hint" open placement="top">
        <button type="button">Go</button>
      </Tooltip>,
    );
    expect(wrap()).toHaveAttribute('data-visible', 'true');
    expect(wrap()).toHaveAttribute('data-placement', 'top');
  });

  it('is dismissed with Escape while focus stays on the trigger', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip label="Hint">
        <button type="button">Go</button>
      </Tooltip>,
    );
    await user.tab();
    await user.keyboard('{Escape}');
    expect(wrap()).toHaveAttribute('data-visible', 'false');
    expect(screen.getByRole('button')).toHaveFocus();
  });

  it('opens on a touch tap and closes on a press elsewhere', () => {
    render(
      <>
        <Tooltip label="Hint">
          <button type="button">Go</button>
        </Tooltip>
        <p>Elsewhere</p>
      </>,
    );
    const button = screen.getByRole('button');
    fireEvent.pointerDown(button, { pointerType: 'touch' });
    fireEvent.click(button);
    expect(wrap()).toHaveAttribute('data-visible', 'true');
    fireEvent.pointerDown(screen.getByText('Elsewhere'));
    expect(wrap()).toHaveAttribute('data-visible', 'false');
  });

  it('ignores a mouse click and a tap when tap-open is off', () => {
    render(
      <Tooltip label="Hint" openOnTap={false}>
        <button type="button">Go</button>
      </Tooltip>,
    );
    const button = screen.getByRole('button');
    fireEvent.pointerDown(button, { pointerType: 'touch' });
    fireEvent.click(button);
    expect(wrap()).toHaveAttribute('data-visible', 'false');
    fireEvent.pointerDown(button, { pointerType: 'mouse' });
    fireEvent.click(button);
    expect(wrap()).toHaveAttribute('data-visible', 'false');
  });
});
