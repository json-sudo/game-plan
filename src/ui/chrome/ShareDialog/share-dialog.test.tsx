import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareDialog } from '.';

const LINK = 'https://gameplan.app/#s=v6.abc';

afterEach(() => vi.unstubAllGlobals());

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
}

describe('ShareDialog', () => {
  it('copies the link when it opens and says so', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<ShareDialog link={LINK} onClose={vi.fn<() => void>()} />);
    expect(screen.getByRole('dialog', { name: 'Share tactic' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Link' })).toHaveValue(LINK);
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
    expect(screen.getByText('Paste it in your group chat.')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(LINK);
  });

  it('does not claim a copy when the clipboard is blocked and selects the link', async () => {
    stubClipboard(() => Promise.reject(new Error('blocked')));
    render(<ShareDialog link={LINK} onClose={vi.fn<() => void>()} />);
    const field = screen.getByRole<HTMLInputElement>('textbox', { name: 'Link' });
    await waitFor(() => expect(field.selectionEnd).toBe(LINK.length));
    expect(field.selectionStart).toBe(0);
    expect(screen.queryByText('Link copied')).not.toBeInTheDocument();
  });

  it('closes from Done', async () => {
    stubClipboard(() => Promise.resolve());
    const onClose = vi.fn<() => void>();
    render(<ShareDialog link={LINK} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
