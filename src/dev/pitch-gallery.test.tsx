import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PitchGallery } from './PitchGallery';

describe('PitchGallery', () => {
  it('shows every Part 2 component in its own labelled section', () => {
    render(<PitchGallery />);
    for (const name of [
      'Pitch surface',
      'Pieces',
      'Arrows',
      'Zone map',
      'Bench and chips',
      'Roles',
      'Visualization controls',
      'ZoneShape showcase',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeTruthy();
    }
  });

  it('shows the component states', () => {
    render(<PitchGallery />);
    expect(screen.getAllByRole('radiogroup').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('img', { name: /pitch/i }).length).toBeGreaterThan(2);
  });
});

describe('ZoneShape showcase', () => {
  it('shows formation slots, the right flank final third Shape, and Final', () => {
    render(<PitchGallery />);
    const showcase = screen.getByRole('region', { name: 'ZoneShape showcase' });
    const view = within(showcase);
    expect(view.getByRole('img', { name: /formation slots/i })).toBeTruthy();
    expect(view.getByRole('img', { name: /right flank - final third.*shape/i })).toBeTruthy();
    expect(view.getByRole('img', { name: /right flank - final third.*final/i })).toBeTruthy();
  });
});
