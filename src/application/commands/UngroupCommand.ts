import { HierarchyEditor } from '../../domain/HierarchyEditor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class UngroupCommand extends EditCommand {
  public constructor(session: EditorSession, private readonly id: string) { super(session); }
  protected override apply(document: SvgDocument): void {
    const shape = document.find(this.id);
    new HierarchyEditor(document).ungroup(this.id);
    this.result = `${shape.tagName}#${shape.id} ungrouped`;
  }
}
