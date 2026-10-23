import { Geometry } from './Geometry.js';
import { TreeNode } from './TreeNode.js';

/** Composite component: clients use the same operations for leaves and groups. */
export abstract class Shape extends TreeNode {
  private readonly styles = new Map<string, string>();
  private readonly importedPresentation = new Map<string, string>();

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
      ...Object.fromEntries(this.importedPresentation),
    });
  }

  public get text(): string | undefined {
    return undefined;
  }

  public get points(): readonly (readonly [number, number])[] { return []; }
  public get geometryNames(): readonly string[] { return []; }

  /** SVG presentation can be preserved without widening the CLI set whitelist. */
  public importAttribute(name: string, value: string): void {
    if (name === 'font-size') {
      const normalized = value.trim();
      if (normalized !== 'inherit') {
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?:px|em|%)?$/u.test(normalized)) {
          throw new Error(`invalid font-size: ${value}`);
        }
        Geometry.requireNonNegative(Geometry.parseNumber(normalized.replace(/(?:px|em|%)$/u, ''), name), name);
      }
      this.importedPresentation.set(name, normalized);
    } else if (name === 'text-anchor') {
      if (!['start', 'middle', 'end', 'inherit'].includes(value.trim())) throw new Error(`invalid text-anchor: ${value}`);
      this.importedPresentation.set(name, value.trim());
    } else {
      this.set(name, value);
    }
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
    for (const [name, value] of this.importedPresentation) copy.importAttribute(name, value);
    return copy;
  }
}
