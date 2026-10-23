import { Geometry } from '../domain/Geometry.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { CreateCommand } from './commands/CreateCommand.js';
import type { ShapeView } from './ShapeView.js';

export class EditorSession {
  private document: SvgDocument | undefined;

  public constructor(private readonly factory = new ShapeFactory()) {}

  public requireDocument(): SvgDocument {
    if (this.document === undefined) throw new Error("no document. use 'init' or 'read' first");
    return this.document;
  }

  public initialize(width?: string, height?: string): void {
    const document = new SvgDocument(
      width === undefined ? 800 : Geometry.parseNumber(width, 'canvas width'),
      height === undefined ? 600 : Geometry.parseNumber(height, 'canvas height'),
    );
    this.document = document;
  }

  public canvas(width?: string, height?: string): Readonly<{ width: number; height: number }> {
    const document = this.requireDocument();
    if (width !== undefined && height !== undefined) {
      document.resize(Geometry.parseNumber(width, 'canvas width'), Geometry.parseNumber(height, 'canvas height'));
    } else if (width !== undefined || height !== undefined) {
      throw new Error('usage: canvas [w] [h]');
    }
    return Object.freeze({ width: document.width, height: document.height });
  }

  public prepareCreate(type: string, id: string, values: readonly string[], containerId?: string): CreateCommand {
    this.requireDocument();
    return new CreateCommand(this, this.factory, type, id, this.factory.parameters(type, values), containerId);
  }

  public create(type: string, id: string, values: readonly string[], containerId?: string): string {
    const command = this.prepareCreate(type, id, values, containerId);
    command.execute();
    return command.summary;
  }

  public tree(id?: string): ShapeView {
    const document = this.requireDocument();
    if (id !== undefined) return this.view(document.find(id));
    return Object.freeze({
      id: undefined, tagName: 'svg', parent: undefined,
      attributes: Object.freeze({ width: String(document.width), height: String(document.height) }),
      text: undefined, children: Object.freeze(document.children.map((child) => this.view(child))),
    });
  }

  public show(id: string): ShapeView {
    return this.view(this.requireDocument().find(id));
  }

  private view(shape: Shape): ShapeView {
    const parent = shape.parent;
    return Object.freeze({
      id: shape.id, tagName: shape.tagName,
      parent: parent === null ? undefined : parent.id === undefined ? 'svg' : `${parent.tagName}#${parent.id}`,
      attributes: shape.attributes, text: shape.text,
      children: Object.freeze(shape.children.map((child) => this.view(child))),
    });
  }
}
