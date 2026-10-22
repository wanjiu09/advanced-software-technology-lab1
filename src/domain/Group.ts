import { Geometry } from './Geometry.js';
import { Shape } from './Shape.js';

export class Group extends Shape {
  public override get tagName(): string {
    return 'g';
  }

  public override get isContainer(): boolean {
    return true;
  }

  public override validateMove(dx: number, dy: number): void {
    Geometry.requireFinite(dx, 'dx');
    Geometry.requireFinite(dy, 'dy');
    for (const child of this.children) {
      child.validateMove(dx, dy);
    }
  }

  public override move(dx: number, dy: number): void {
    // Preflight the whole subtree, so overflow cannot leave earlier siblings changed.
    this.validateMove(dx, dy);
    for (const child of this.children) {
      child.move(dx, dy);
    }
  }

  public override validateScale(factor: number): void {
    Geometry.requirePositive(factor, 'scale factor');
    for (const child of this.children) {
      child.validateScale(factor);
    }
  }

  public override scale(factor: number): void {
    this.validateScale(factor);
    for (const child of this.children) {
      child.scale(factor);
    }
  }

  public override copy(): Group {
    const copy = this.copyStylesTo(new Group(this.id));
    for (const child of this.children) {
      copy.appendChild(child.copy());
    }
    return copy;
  }
}
