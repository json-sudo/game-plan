import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RolePreview } from '.';

describe('RolePreview', () => {
  it('reads "Holds position" when the role does not move', () => {
    render(<RolePreview from={{ x: 30, y: 40 }} to={{ x: 30, y: 40 }} />);
    expect(screen.getByText('Holds position')).toBeInTheDocument();
  });

  it('does not read "Holds position" when the role moves', () => {
    render(<RolePreview from={{ x: 30, y: 40 }} to={{ x: 30, y: 20 }} />);
    expect(screen.queryByText('Holds position')).not.toBeInTheDocument();
  });

  it('exposes the label as the accessible name', () => {
    render(
      <RolePreview from={{ x: 30, y: 40 }} to={{ x: 30, y: 20 }} label="Inside forward run" />,
    );
    expect(screen.getByRole('img', { name: 'Inside forward run' })).toBeInTheDocument();
  });
});
