import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class MoveCommand extends EditCommand {
  public constructor(session: EditorSession, private readonly id: string,
    private readonly dx: number, private readonly dy: number) { super(session); }

  protected override apply(document: SvgDocument): void {
    const shape = document.find(this.id);
    const before = shape.points[0];
    shape.move(this.dx, this.dy);
    const name = `${shape.tagName}#${shape.id}`;
    const after = shape.points[0];
    this.result = after === undefined ? `${name} moved by (${this.dx},${this.dy})`
      : `${name} moved to (${after[0]},${after[1]})`;
    this.reversedResult = before === undefined ? `${name} moved back by (${-this.dx},${-this.dy})`
      : `${name} moved back to (${before[0]},${before[1]})`;
  }
}
