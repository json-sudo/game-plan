import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportDialog } from '.';

vi.mock('../png', () => ({
  renderPng: vi
    .fn<() => Promise<Blob>>()
    .mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
}));

beforeEach(() => {
  URL.createObjectURL = vi.fn<() => string>().mockReturnValue('blob:preview');
  URL.revokeObjectURL = vi.fn<() => void>();
});
afterEach(() => vi.restoreAllMocks());

const FRAME = {
  mine: 'My team',
  opponent: 'Opponent',
  zoneName: 'Right flank - final third',
  tokens: [],
  tokenPx: 34,
};

describe('ExportDialog', () => {
  it('previews the image with the zone name and the size note', async () => {
    render(<ExportDialog frame={FRAME} onClose={vi.fn<() => void>()} />);
    expect(screen.getByRole('dialog', { name: 'Export PNG' })).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: 'Preview of the exported image' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1080 × 1350 PNG. Reads at group-chat size.')).toBeInTheDocument();
    expect(screen.getAllByText('Right flank - final third').length).toBeGreaterThan(0);
  });

  it('cancels without downloading', async () => {
    const onClose = vi.fn<() => void>();
    render(<ExportDialog frame={FRAME} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('downloads the frozen image only from Download PNG', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    render(<ExportDialog frame={FRAME} onClose={vi.fn<() => void>()} />);
    const download = screen.getByRole('button', { name: 'Download PNG' });
    expect(download).toBeDisabled();
    await screen.findByRole('img', { name: 'Preview of the exported image' });
    expect(click).not.toHaveBeenCalled();
    await userEvent.click(download);
    expect(click).toHaveBeenCalledTimes(1);
  });
});
