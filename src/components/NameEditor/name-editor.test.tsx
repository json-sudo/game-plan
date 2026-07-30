import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BoardProvider, useBoardDispatch } from '../../board/BoardContext';
import { DragProvider } from '../../board/DragContext';
import { Bench } from '../Bench';
import { NameEditorProvider, useNameEditor } from '.';

function RenameToggle() {
  const { renaming, toggleRenaming } = useNameEditor();
  return (
    <button type="button" onClick={toggleRenaming}>
      {renaming ? 'rename on' : 'rename off'}
    </button>
  );
}

function DispatchProbe() {
  const dispatch = useBoardDispatch();
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'PLACE_PIECE', id: 'mine-1', position: { x: 10, y: 20 } })}
    >
      place-piece
    </button>
  );
}

function renderBench() {
  return render(
    <BoardProvider>
      <DragProvider>
        <NameEditorProvider>
          <RenameToggle />
          <Bench />
          <DispatchProbe />
        </NameEditorProvider>
      </DragProvider>
    </BoardProvider>,
  );
}

function turnOnRename() {
  fireEvent.click(screen.getByRole('button', { name: 'rename off' }));
}

function tap(el: Element) {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
  fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });
}

describe('Rename mode toggle', () => {
  it('is off by default: pointer-down on a piece does not open the name input', () => {
    renderBench();
    tap(screen.getAllByLabelText('my team CB')[0]);
    expect(screen.queryByLabelText('Piece name')).not.toBeInTheDocument();
  });

  it('turning it on and clicking a piece opens an input pre-filled with its current name (empty if unset)', () => {
    renderBench();
    turnOnRename();
    tap(screen.getAllByLabelText('my team CB')[0]);
    const input = screen.getByLabelText('Piece name') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('typing and pressing Enter sets the name and closes the input', () => {
    renderBench();
    turnOnRename();
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
    turnOnRename();
    const piece = screen.getAllByLabelText('my team CB')[0];
    tap(piece);
    fireEvent.change(screen.getByLabelText('Piece name'), { target: { value: 'Alex' } });
    fireEvent.keyDown(screen.getByLabelText('Piece name'), { key: 'Enter' });
    tap(piece);
    expect((screen.getByLabelText('Piece name') as HTMLInputElement).value).toBe('Alex');
  });

  it('confirming an empty/whitespace value clears the name', () => {
    renderBench();
    turnOnRename();
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
    turnOnRename();
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
    turnOnRename();
    tap(screen.getAllByLabelText('my team CB')[0]);
    const input = screen.getByLabelText('Piece name');
    expect(input).toHaveAttribute('maxlength', '24');
  });

  it('the ball piece has no name-editing affordance even while rename mode is on', () => {
    renderBench();
    turnOnRename();
    tap(screen.getByLabelText('ball'));
    expect(screen.queryByLabelText('Piece name')).not.toBeInTheDocument();
  });

  it('with rename mode off, pointer down/move/up drags a piece and never opens the name input', () => {
    renderBench();
    const piece = screen.getAllByLabelText('my team CB')[0];
    fireEvent.pointerDown(piece, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 200 });
    fireEvent.pointerUp(window, { clientX: 200, clientY: 200 });
    expect(screen.queryByLabelText('Piece name')).not.toBeInTheDocument();
  });

  it('with rename mode on, pointer-down on a player piece does not dispatch a drag placement', () => {
    renderBench();
    turnOnRename();
    const piece = screen.getAllByLabelText('my team CB')[0];
    fireEvent.pointerDown(piece, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 200 });
    fireEvent.pointerUp(window, { clientX: 200, clientY: 200 });
    expect(screen.getByLabelText('Piece name')).toBeInTheDocument();
  });
});
