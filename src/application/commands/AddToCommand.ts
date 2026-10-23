import { HierarchyEditor } from '../../domain/HierarchyEditor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class AddToCommand extends EditCommand {
  public constructor(session: EditorSession, private readonly containerId: string,
    private readonly id: string) { super(session); }
  protected override apply(document: SvgDocument): void {
    const parent = document.find(this.id).parent;
    new HierarchyEditor(document).addto(this.containerId, this.id);
    const shape = document.find(this.id);
    this.result = `${shape.tagName}#${shape.id} moved into g#${this.containerId}`;
    this.reversedResult = `${shape.tagName}#${shape.id} moved into ${parent?.id === undefined ? 'svg' : `${parent.tagName}#${parent.id}`}`;
  }
}
