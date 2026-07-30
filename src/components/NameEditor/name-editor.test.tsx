import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardProvider } from '../../board/BoardContext';
import { DragProvider, DRAG_THRESHOLD_PX } from '../../board/DragContext';
import { Bench } from '../Bench';
import { NameEditorProvider } from '.';

function renderBench() {
  return render(
    <BoardProvider>
      <DragProvider>
        <NameEditorProvider>
          <Bench />
        </NameEditorProvider>
      </DragProvider>
    </BoardProvider>,
  );
}

function tap(el: Element) {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
  fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });
}

describe('name editing via click-to-edit', () => {
  it('clicking a piece opens an input pre-filled with its current name (empty if unset)', () => {
    renderBench();
    tap(screen.getAllByLabelText('my team CB')[0]);
    const input = screen.getByLabelText('Piece name') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('typing and pressing Enter sets the name and closes the input', () => {
    renderBench();
    const piece = screen.getAllByLabelText('my team CB')[0];
    tap(piece);
    const input = screen.getByLabelText('Piece name');
    fireEvent.change(input, { target: { value: 'Alex' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByLabelText('Piece name')).not.toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
  });

  it('re-opening shows the previously set name', () => {
    renderBench();
    const piece = screen.getAllByLabelText('my team CB')[0];
    tap(piece);
    fireEvent.change(screen.getByLabelText('Piece name'), { target: { value: 'Alex' } });
    fireEvent.keyDown(screen.getByLabelText('Piece name'), { key: 'Enter' });
    tap(piece);
    expect((screen.getByLabelText('Piece name') as HTMLInputElement).value).toBe('Alex');
  });

  it('confirming an empty/whitespace value clears the name', () => {
    renderBench();
    const piece = screen.getAllByLabelText('my team CB')[0];
    tap(piece);
    fireEvent.change(screen.getByLabelText('Piece name'), { target: { value: 'Alex' } });
    fireEvent.keyDown(screen.getByLabelText('Piece name'), { key: 'Enter' });
    tap(piece);
    fireEvent.change(screen.getByLabelText('Piece name'), { target: { value: '   ' } });
    fireEvent.keyDown(screen.getByLabelText('Piece name'), { key: 'Enter' });
    expect(screen.queryByText('Alex')).not.toBeInTheDocument();
  });

  it('pressing Escape cancels without changing the stored name', () => {
    renderBench();
    const piece = screen.getAllByLabelText('my team CB')[0];
    tap(piece);
    fireEvent.change(screen.getByLabelText('Piece name'), { target: { value: 'Alex' } });
    fireEvent.keyDown(screen.getByLabelText('Piece name'), { key: 'Enter' });

    tap(piece);
    fireEvent.change(screen.getByLabelText('Piece name'), { target: { value: 'Bailey' } });
    fireEvent.keyDown(screen.getByLabelText('Piece name'), { key: 'Escape' });

    expect(screen.queryByLabelText('Piece name')).not.toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.queryByText('Bailey')).not.toBeInTheDocument();
  });

  it('enforces a 24-character maxLength', () => {
    renderBench();
    tap(screen.getAllByLabelText('my team CB')[0]);
    const input = screen.getByLabelText('Piece name');
    expect(input).toHaveAttribute('maxlength', '24');
  });

  it('a drag gesture (pointer down + move past threshold) does not open the name input', () => {
    renderBench();
    const piece = screen.getAllByLabelText('my team CB')[0];
    fireEvent.pointerDown(piece, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, {
      clientX: 100,
      clientY: 100 + DRAG_THRESHOLD_PX + 1,
    });
    fireEvent.pointerUp(window, { clientX: 100, clientY: 100 + DRAG_THRESHOLD_PX + 1 });
    expect(screen.queryByLabelText('Piece name')).not.toBeInTheDocument();
  });

  it('the ball piece has no name-editing affordance', async () => {
    renderBench();
    const ball = screen.getByLabelText('ball');
    tap(ball);
    expect(screen.queryByLabelText('Piece name')).not.toBeInTheDocument();
    await userEvent.hover(ball);
  });
});
