import type { ShapeFactory } from '../../domain/ShapeFactory.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  private readonly attributes: Readonly<Record<string, string>>;
  private result = '';

  public constructor(
    session: EditorSession,
    private readonly factory: ShapeFactory,
    private readonly type: string,
    private readonly id: string,
    attributes: Readonly<Record<string, string>>,
    private readonly containerId?: string,
  ) {
    super(session);
    this.attributes = Object.freeze({ ...attributes });
  }

  public get summary(): string {
    return this.result;
  }

  protected override apply(document: SvgDocument): void {
    const shape = this.factory.create(this.type, this.id, this.attributes);
    document.add(shape, this.containerId);
    this.result = `${shape.tagName}#${shape.id} created${this.containerId === undefined ? '' : ` in g#${this.containerId}`}`;
  }
}
