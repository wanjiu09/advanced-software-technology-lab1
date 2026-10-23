import { HierarchyEditor } from '../../domain/HierarchyEditor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class AddToCommand extends EditCommand {
  public constructor(session: EditorSession, private readonly containerId: string,
    private readonly id: string) { super(session); }
  protected override apply(document: SvgDocument): void {
    new HierarchyEditor(document).addto(this.containerId, this.id);
    const shape = document.find(this.id);
    this.result = `${shape.tagName}#${shape.id} moved into g#${this.containerId}`;
  }
}
