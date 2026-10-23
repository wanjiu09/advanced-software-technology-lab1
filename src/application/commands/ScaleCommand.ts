import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class ScaleCommand extends EditCommand {
  public constructor(session: EditorSession, private readonly id: string,
    private readonly factor: number) { super(session); }

  protected override apply(document: SvgDocument): void {
    const shape = document.find(this.id);
    shape.scale(this.factor);
    this.result = `${shape.tagName}#${shape.id} scaled by ${this.factor}`;
    this.reversedResult = `${shape.tagName}#${shape.id} scale restored`;
  }
}
