import { Geometry } from './Geometry.js';
import { TreeNode } from './TreeNode.js';

/** Composite component: clients use the same operations for leaves and groups. */
export abstract class Shape extends TreeNode {
  private readonly styles = new Map<string, string>();

  public constructor(private readonly identifier: string) {
    super();
    if (identifier.length === 0 || /[\s\u0000-\u001f\u007f]/u.test(identifier)) {
      throw new Error(`invalid id: ${identifier}`);
    }
  }

  public override get id(): string {
    return this.identifier;
  }

  public get attributes(): Readonly<Record<string, string>> {
    return Object.freeze({
      id: this.id,
      ...this.geometryAttributes(),
      ...Object.fromEntries(this.styles),
    });
  }

  public get text(): string | undefined {
    return undefined;
  }

  public set(name: string, value: string): void {
    if (name === 'fill' || name === 'stroke') {
      this.styles.set(name, value);
    } else if (name === 'stroke-width') {
      const width = Geometry.requireNonNegative(Geometry.parseNumber(value, name), name);
      this.styles.set(name, String(width));
    } else {
      throw new Error(`unknown attribute: ${name}`);
    }
  }

  public abstract validateMove(dx: number, dy: number): void;
  public abstract move(dx: number, dy: number): void;
  public abstract validateScale(factor: number): void;
  public abstract scale(factor: number): void;
  public abstract copy(): Shape;

  protected geometryAttributes(): Readonly<Record<string, string>> {
    return {};
  }

  protected copyStylesTo<T extends Shape>(copy: T): T {
    for (const [name, value] of this.styles) {
      copy.set(name, value);
    }
    return copy;
  }
}
