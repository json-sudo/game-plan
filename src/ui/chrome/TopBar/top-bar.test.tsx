import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from '.';

describe('TopBar on desktop', () => {
  it('is the banner with both team names and the mode', () => {
    render(
      <TopBar
        mine="Arsenal"
        opp="Chelsea"
        mode="fm"
        onModeChange={vi.fn<(mode: 'open' | 'fm') => void>()}
      />,
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'My team name' })).toHaveValue('Arsenal');
    expect(screen.getByRole('textbox', { name: 'Opponent name' })).toHaveValue('Chelsea');
    expect(screen.getByRole('radio', { name: 'FM mode' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Open pitch' })).not.toBeChecked();
  });

  it('uses the default team names', () => {
    render(<TopBar />);
    expect(screen.getByRole('textbox', { name: 'My team name' })).toHaveValue('My team');
    expect(screen.getByRole('textbox', { name: 'Opponent name' })).toHaveValue('Opponent');
    expect(screen.getByText('Open pitch')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('makes team fields read-only without rename handlers', () => {
    render(<TopBar mine="Arsenal" opp="Chelsea" />);
    expect(screen.getByRole('textbox', { name: 'My team name' })).toHaveAttribute('readOnly');
    expect(screen.getByRole('textbox', { name: 'Opponent name' })).toHaveAttribute('readOnly');
  });

  it('offers the full action set with copy-deck names', () => {
    render(<TopBar canUndo canRedo canReset onToggleTheme={vi.fn<() => void>()} />);
    for (const name of [
      'Undo',
      'Redo',
      'Reset',
      'Clear',
      'Save',
      'Load',
      'Copy tactic JSON',
      'Dark theme',
      'Export PNG',
      'Share tactic',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('shows the theme action for the other theme', () => {
    const { rerender } = render(<TopBar theme="light" onToggleTheme={vi.fn<() => void>()} />);
    expect(screen.getByRole('button', { name: 'Dark theme' })).toBeInTheDocument();
    rerender(<TopBar theme="dark" onToggleTheme={vi.fn<() => void>()} />);
    expect(screen.getByRole('button', { name: 'Light theme' })).toBeInTheDocument();
  });

  it('omits the theme toggle without a handler', () => {
    render(<TopBar theme="light" />);
    expect(screen.queryByRole('button', { name: 'Dark theme' })).not.toBeInTheDocument();
  });

  it('disables Reset with its reason instead of hiding it', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn<() => void>();
    render(<TopBar canReset={false} onReset={onReset} />);
    const reset = screen.getByRole('button', { name: 'Reset' });
    expect(reset).toHaveAccessibleDescription('Apply a formation or matchup first.');
    await user.click(reset);
    expect(onReset).not.toHaveBeenCalled();
    await user.hover(reset);
    const tip = screen.getByText('Apply a formation or matchup first.', {
      selector: '[role="tooltip"]',
    });
    expect(tip.parentElement).toHaveAttribute('data-visible', 'true');
  });

  it('lets a preview force the Reset tip open', () => {
    render(<TopBar canReset={false} showResetTip />);
    const tips = screen.getAllByRole('tooltip', { hidden: true });
    const visible = tips.filter(
      (tip) => tip.parentElement?.getAttribute('data-visible') === 'true',
    );
    expect(visible.map((tip) => tip.textContent)).toContain('Apply a formation or matchup first.');
  });

  it('keeps Share as the only ink button', () => {
    const { container } = render(<TopBar canUndo canRedo canReset />);
    const ink = container.querySelectorAll('[data-variant="ink"]');
    expect(ink).toHaveLength(1);
    expect(ink[0]).toHaveTextContent('Share tactic');
  });

  it('sends every action to its callback', async () => {
    const user = userEvent.setup();
    const handlers = {
      onUndo: vi.fn<() => void>(),
      onRedo: vi.fn<() => void>(),
      onReset: vi.fn<() => void>(),
      onClear: vi.fn<() => void>(),
      onSave: vi.fn<() => void>(),
      onLoad: vi.fn<() => void>(),
      onCopyJson: vi.fn<() => void>(),
      onToggleTheme: vi.fn<() => void>(),
      onExport: vi.fn<() => void>(),
      onShare: vi.fn<() => void>(),
    };
    render(<TopBar canUndo canRedo canReset {...handlers} />);
    for (const name of [
      'Undo',
      'Redo',
      'Reset',
      'Clear',
      'Save',
      'Load',
      'Copy tactic JSON',
      'Dark theme',
      'Export PNG',
      'Share tactic',
    ]) {
      await user.click(screen.getByRole('button', { name }));
    }
    for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports renamed teams and a changed mode', async () => {
    const user = userEvent.setup();
    const onMineChange = vi.fn<() => void>();
    const onOppChange = vi.fn<() => void>();
    const onModeChange = vi.fn<() => void>();
    render(
      <TopBar
        mine=""
        opp=""
        onMineChange={onMineChange}
        onOppChange={onOppChange}
        onModeChange={onModeChange}
      />,
    );
    await user.type(screen.getByRole('textbox', { name: 'My team name' }), 'A');
    await user.type(screen.getByRole('textbox', { name: 'Opponent name' }), 'B');
    await user.click(screen.getByRole('radio', { name: 'FM mode' }));
    expect(onMineChange).toHaveBeenCalledWith('A');
    expect(onOppChange).toHaveBeenCalledWith('B');
    expect(onModeChange).toHaveBeenCalledWith('fm');
  });
});

describe('TopBar on a phone', () => {
  it('shows the match title with the mode under it', () => {
    render(<TopBar phone mine="Arsenal" opp="Chelsea" mode="fm" />);
    expect(screen.getByText('Arsenal v Chelsea')).toBeInTheDocument();
    expect(screen.getByText('FM mode')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveAttribute('data-phone', 'true');
  });

  it('keeps only Undo, Share and the menu', () => {
    render(<TopBar phone canUndo />);
    const bar = screen.getByRole('banner');
    expect(
      within(bar)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Undo', 'Share tactic', 'Menu']);
    expect(within(bar).queryByRole('button', { name: 'Copy tactic JSON' })).not.toBeInTheDocument();
    expect(within(bar).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('explains a disabled Undo and runs the callbacks', async () => {
    const onShare = vi.fn<() => void>();
    const onMenu = vi.fn<() => void>();
    render(<TopBar phone onShare={onShare} onMenu={onMenu} menuOpen />);
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAccessibleDescription(
      'Nothing to undo yet.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Share tactic' }));
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onMenu).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('runs Undo when it can', async () => {
    const onUndo = vi.fn<() => void>();
    render(<TopBar phone canUndo onUndo={onUndo} />);
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('uses Open pitch as the default mode', () => {
    render(<TopBar phone />);
    expect(screen.getByText('Open pitch')).toBeInTheDocument();
  });
});
