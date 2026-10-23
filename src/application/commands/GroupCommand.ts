import { HierarchyEditor } from '../../domain/HierarchyEditor.js';
import type { ShapeFactory } from '../../domain/ShapeFactory.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class GroupCommand extends EditCommand {
  private readonly ids: readonly string[];
  public constructor(session: EditorSession, private readonly factory: ShapeFactory,
    private readonly id: string, ids: readonly string[]) {
    super(session);
    this.ids = Object.freeze([...ids]);
  }
  protected override apply(document: SvgDocument): void {
    const group = this.factory.create('g', this.id);
    new HierarchyEditor(document).group(group, this.ids);
    this.result = `g#${this.id} created with ${group.children.length} children`;
    this.reversedResult = `g#${this.id} ungrouped`;
  }
}
