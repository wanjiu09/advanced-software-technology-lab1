import type { Shape } from './Shape.js';

/** Owns tree links so every container mutation preserves ownership and unique IDs. */
export abstract class TreeNode {
  private parentNode: TreeNode | null = null;
  private readonly childNodes: Shape[] = [];

  public abstract get id(): string | undefined;
  public abstract get tagName(): string;

  public get isContainer(): boolean {
    return false;
  }

  public get parent(): TreeNode | null {
    return this.parentNode;
  }

  public get children(): readonly Shape[] {
    return Object.freeze([...this.childNodes]);
  }

  public *descendants(): IterableIterator<Shape> {
    for (const child of this.childNodes) {
      yield child;
      yield* child.descendants();
    }
  }

  public appendChild(shape: Shape): void {
    this.insertChild(shape, this.childNodes.length);
  }

  public insertChild(shape: Shape, index: number): void {
    this.requireContainer();
    if (!Number.isInteger(index) || index < 0 || index > this.childNodes.length) {
      throw new Error('child index out of range');
    }
    if (shape.contains(this)) {
      throw new Error(`cannot add a shape into its own descendant: ${shape.id}`);
    }
    if (shape.parentNode !== null) {
      throw new Error(`shape already has a parent: ${shape.id}`);
    }

    const root = this.root();
    const ids = new Set<string>();
    if (root.id !== undefined) {
      ids.add(root.id);
    }
    for (const node of root.descendants()) {
      ids.add(node.id);
    }
    for (const node of [shape, ...shape.descendants()]) {
      if (ids.has(node.id)) {
        throw new Error(`id already exists: ${node.id}`);
      }
      ids.add(node.id);
    }

    this.childNodes.splice(index, 0, shape);
    shape.parentNode = this;
  }

  public removeChild(shape: Shape): void {
    this.requireContainer();
    const index = this.childNodes.indexOf(shape);
    if (index < 0) {
      throw new Error(`shape is not a child: ${shape.id}`);
    }
    this.childNodes.splice(index, 1);
    shape.parentNode = null;
  }

  private contains(node: TreeNode): boolean {
    return this === node || this.childNodes.some((child) => child.contains(node));
  }

  private root(): TreeNode {
    let node: TreeNode = this;
    while (node.parentNode !== null) {
      node = node.parentNode;
    }
    return node;
  }

  private requireContainer(): void {
    if (!this.isContainer) {
      throw new Error(`not a container: ${this.id}`);
    }
  }
}
