import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class SetCommand extends EditCommand {
  public constructor(session: EditorSession, private readonly id: string,
    private readonly attribute: string, private readonly value: string) { super(session); }

  protected override apply(document: SvgDocument): void {
    const shape = document.find(this.id);
    shape.set(this.attribute, this.value);
    this.result = `${shape.tagName}#${shape.id} updated: ${this.attribute}=${JSON.stringify(this.value)}`;
  }
}
