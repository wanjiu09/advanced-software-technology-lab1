import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class MoveCommand extends EditCommand {
  public constructor(session: EditorSession, private readonly id: string,
    private readonly dx: number, private readonly dy: number) { super(session); }

  protected override apply(document: SvgDocument): void {
    const shape = document.find(this.id);
    shape.move(this.dx, this.dy);
    this.result = `${shape.tagName}#${shape.id} moved by (${this.dx},${this.dy})`;
  }
}
