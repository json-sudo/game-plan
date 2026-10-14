import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Instrument } from '.';

describe('Instrument', () => {
  it('renders both children in one panel', () => {
    render(
      <Instrument>
        <div>Zone map</div>
        <div>Transport</div>
      </Instrument>,
    );
    const panel = screen.getByText('Zone map').closest('[data-instrument]');
    expect(panel).not.toBeNull();
    expect(panel!.contains(screen.getByText('Transport'))).toBe(true);
  });
});
