import { Geometry } from './Geometry.js';
import { DocumentMemento } from './DocumentMemento.js';
import type { Shape } from './Shape.js';
import { TreeNode } from './TreeNode.js';

export class SvgDocument extends TreeNode {
  private canvasWidth: number;
  private canvasHeight: number;

  public constructor(width = 800, height = 600) {
    super();
    this.canvasWidth = Geometry.requirePositive(width, 'canvas width');
    this.canvasHeight = Geometry.requirePositive(height, 'canvas height');
  }

  public override get id(): undefined {
    return undefined;
  }

  public override get tagName(): string {
    return 'svg';
  }

  public override get isContainer(): boolean {
    return true;
  }

  public get width(): number {
    return this.canvasWidth;
  }

  public get height(): number {
    return this.canvasHeight;
  }

  public get size(): number {
    return [...this.descendants()].length;
  }

  public resize(width: number, height: number): void {
    Geometry.requirePositive(width, 'canvas width');
    Geometry.requirePositive(height, 'canvas height');
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public add(shape: Shape, containerId?: string): void {
    if (containerId === undefined) {
      this.appendChild(shape);
      return;
    }
    this.findContainer(containerId).appendChild(shape);
  }

  public findContainer(id: string): Shape {
    const container = this.lookup(id);
    if (container === undefined) throw new Error(`no such container: ${id}`);
    if (!container.isContainer) throw new Error(`not a container: ${id}`);
    return container;
  }

  public find(id: string): Shape {
    const shape = this.lookup(id);
    if (shape === undefined) {
      throw new Error(`no such shape: ${id}`);
    }
    return shape;
  }

  public createMemento(): DocumentMemento {
    return new DocumentMemento(this);
  }

  public restore(memento: DocumentMemento): void {
    const restored = memento.materialize();
    for (const child of this.children) {
      this.removeChild(child);
    }
    this.resize(restored.width, restored.height);
    for (const child of restored.children) {
      restored.removeChild(child);
      this.appendChild(child);
    }
  }

  public copy(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height);
    for (const child of this.children) {
      copy.appendChild(child.copy());
    }
    return copy;
  }

  private lookup(id: string): Shape | undefined {
    // Traverse the authoritative tree instead of maintaining a second mutable index.
    for (const shape of this.descendants()) {
      if (shape.id === id) {
        return shape;
      }
    }
    return undefined;
  }
}
