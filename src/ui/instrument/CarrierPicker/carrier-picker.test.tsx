import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CarrierPicker, type CarrierOption } from '.';

const OPTIONS: CarrierOption[] = [
  { id: 'mine-DR', label: 'D(R)', role: 'Wing Back' },
  { id: 'mine-AMCR', label: 'AM(R)', role: 'Winger' },
];

describe('CarrierPicker', () => {
  it('names the zone and lists each eligible player with its role', () => {
    render(<CarrierPicker zone="Right flank - final third" options={OPTIONS} />);
    expect(screen.getByRole('group', { name: 'Who has the ball?' })).toBeInTheDocument();
    expect(screen.getByText('Eligible in: Right flank - final third')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'D(R) - Wing Back' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'AM(R) - Winger' })).toBeInTheDocument();
  });

  it('marks the current carrier and leaves everyone unchecked before a choice', () => {
    const { rerender } = render(<CarrierPicker zone="Z" options={OPTIONS} />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
    rerender(<CarrierPicker zone="Z" options={OPTIONS} value="mine-AMCR" />);
    expect(screen.getByRole('radio', { name: 'AM(R) - Winger' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'D(R) - Wing Back' })).not.toBeChecked();
  });

  it('asks the user to choose until someone has the ball', () => {
    render(<CarrierPicker zone="Z" options={OPTIONS} />);
    expect(screen.getByText('Pick who has the ball to see the shape.')).toBeInTheDocument();
  });

  it('reports the explicit choice', () => {
    const onChoose = vi.fn<(id: string) => void>();
    render(<CarrierPicker zone="Z" options={OPTIONS} onChoose={onChoose} />);
    fireEvent.click(screen.getByRole('radio', { name: 'D(R) - Wing Back' }));
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('mine-DR');
  });

  it('can be operated from the keyboard with native radio arrows', () => {
    render(<CarrierPicker zone="Z" options={OPTIONS} value="mine-DR" />);
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
    expect(radios.every((radio) => radio.tagName === 'INPUT' && radio.type === 'radio')).toBe(true);
  });

  it('says so when no player in the formation can have the ball in the zone', () => {
    render(<CarrierPicker zone="Left flank - final third" options={[]} />);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No player in this formation can have the ball here. Pick another zone.',
    );
  });
});
