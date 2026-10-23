import { DeleteCommand } from './commands/DeleteCommand.js';
import { SetCommand } from './commands/SetCommand.js';
import { ScaleCommand } from './commands/ScaleCommand.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { HistoryManager } from './HistoryManager.js';
import type { Command } from './commands/Command.js';
import { Geometry } from '../domain/Geometry.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { CreateCommand } from './commands/CreateCommand.js';
import type { ShapeView } from './ShapeView.js';

export class EditorSession {
  private readonly history = new HistoryManager();
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
    this.history.barrier();
  }

  public canvas(width?: string, height?: string): Readonly<{ width: number; height: number }> {
    const document = this.requireDocument();
    if (width !== undefined && height !== undefined) {
      document.resize(Geometry.parseNumber(width, 'canvas width'), Geometry.parseNumber(height, 'canvas height'));
      this.history.barrier();
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
    return this.executeEdit(command);
  }

  public executeEdit(command: Command): string {
    this.requireDocument();
    return this.history.execute(command);
  }

  public move(id: string, dx: string, dy: string): string {
    this.requireDocument();
    return this.executeEdit(new MoveCommand(this, id, Geometry.parseNumber(dx, 'dx'), Geometry.parseNumber(dy, 'dy')));
  }

  public scale(id: string, factor: string): string {
    this.requireDocument();
    return this.executeEdit(new ScaleCommand(this, id, Geometry.parseNumber(factor, 'scale factor')));
  }

  public set(id: string, attribute: string, value: string): string {
    return this.executeEdit(new SetCommand(this, id, attribute, value));
  }

  public delete(id: string): string {
    return this.executeEdit(new DeleteCommand(this, id));
  }

  public undo(): string {
    this.requireDocument();
    return this.history.undo();
  }

  public redo(): string {
    this.requireDocument();
    return this.history.redo();
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
