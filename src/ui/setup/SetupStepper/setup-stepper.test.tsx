import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SetupStepper, type SetupStep } from '.';

const ALL_DONE: SetupStep[] = [
  { title: 'Formations', state: 'done', summary: '4-3-3 DM Wide vs 4-2-3-1 DM Wide' },
  { title: 'Who attacks', state: 'done', summary: 'My team attacks' },
  { title: 'Roles', state: 'done', summary: '22 roles set · 3 changed' },
];

function step(index: number) {
  return screen.getAllByRole('listitem')[index];
}

describe('SetupStepper', () => {
  it('is a labelled list of steps with a step counter on each', () => {
    render(<SetupStepper steps={ALL_DONE} />);
    expect(screen.getByRole('region', { name: 'Guided setup' })).toBeInTheDocument();
    expect(step(0)).toHaveTextContent('Step 1 of 3 · Done');
    expect(step(2)).toHaveTextContent('Step 3 of 3 · Done');
  });

  it('shows a summary for done steps and a check in the disc', () => {
    render(<SetupStepper steps={ALL_DONE} />);
    expect(screen.getByText('My team attacks')).toBeInTheDocument();
    expect(step(1).querySelector('svg')).not.toBeNull();
  });

  it('marks the active step, opens its content and hides its summary', () => {
    render(
      <SetupStepper
        steps={[
          { title: 'Formations', state: 'active', summary: 'hidden', content: <p>Pick teams</p> },
          { title: 'Who attacks' },
          { title: 'Roles' },
        ]}
      />,
    );
    expect(step(0)).toHaveAttribute('aria-current', 'step');
    expect(step(0)).toHaveAttribute('data-state', 'active');
    expect(step(1)).toHaveAttribute('data-state', 'todo');
    expect(screen.getByText('Pick teams')).toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    expect(within(step(0)).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('gives each done step a named Edit button', async () => {
    const onEdit = vi.fn<() => void>();
    render(<SetupStepper steps={ALL_DONE} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Who attacks' }));
    expect(onEdit).toHaveBeenCalledWith(1);
  });

  it('labels the forward button Next, Done, Save or a custom label', () => {
    const { rerender } = render(
      <SetupStepper steps={[{ title: 'One', state: 'active' }, { title: 'Two' }]} />,
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    rerender(
      <SetupStepper
        steps={[
          { title: 'One', state: 'done' },
          { title: 'Two', state: 'active' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    rerender(
      <SetupStepper
        steps={[
          { title: 'One', state: 'done' },
          { title: 'Two', state: 'active', reopened: true },
          { title: 'Three', state: 'done' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(step(1)).toHaveAttribute('data-reopened', 'true');
    rerender(
      <SetupStepper
        steps={[{ title: 'Formations', state: 'active', nextLabel: 'Apply matchup' }]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Apply matchup' })).toBeInTheDocument();
  });

  it('sends Back and the forward button with the step index', async () => {
    const onBack = vi.fn<() => void>();
    const onNext = vi.fn<() => void>();
    render(
      <SetupStepper
        steps={[
          { title: 'One', state: 'done' },
          { title: 'Two', state: 'active' },
          { title: 'Three' },
        ]}
        onBack={onBack}
        onNext={onNext}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onBack).toHaveBeenCalledWith(1);
    expect(onNext).toHaveBeenCalledWith(1);
  });

  it('disables Next with its reason as a line above it and as its tooltip', async () => {
    const onNext = vi.fn<(index: number) => void>();
    render(
      <SetupStepper
        steps={[
          {
            title: 'Formations',
            state: 'active',
            nextDisabled: true,
            nextReason: 'Pick a formation for your team first.',
          },
        ]}
        onNext={onNext}
      />,
    );
    const next = screen.getByRole('button', { name: 'Done' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByText('Pick a formation for your team first.').length).toBeGreaterThan(0);
    await userEvent.click(next);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('shows no summary on todo steps', () => {
    render(
      <SetupStepper
        steps={[
          { title: 'Formations', state: 'active' },
          { title: 'Roles', state: 'todo', summary: 'should not show' },
        ]}
      />,
    );
    expect(screen.queryByText('should not show')).not.toBeInTheDocument();
  });

  it('uses full-size buttons on a phone and small ones on desktop', () => {
    const steps: SetupStep[] = [
      { title: 'One', state: 'done' },
      { title: 'Two', state: 'active' },
    ];
    const { rerender } = render(<SetupStepper steps={steps} />);
    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('data-size', 'sm');
    rerender(<SetupStepper steps={steps} phone />);
    expect(screen.getByRole('button', { name: 'Done' })).not.toHaveAttribute('data-size');
    expect(screen.getByRole('region')).toHaveAttribute('data-phone', 'true');
  });
});
