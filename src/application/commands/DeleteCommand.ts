import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class DeleteCommand extends EditCommand {
  public constructor(session: EditorSession, private readonly id: string) { super(session); }

  protected override apply(document: SvgDocument): void {
    const shape = document.find(this.id);
    const parent = shape.parent;
    if (parent === null) throw new Error(`shape has no parent: ${this.id}`);
    parent.removeChild(shape);
    this.result = `${shape.tagName}#${shape.id} deleted`;
    this.reversedResult = `${shape.tagName}#${shape.id} restored into ${parent.id === undefined ? 'svg' : `${parent.tagName}#${parent.id}`}`;
  }
}
