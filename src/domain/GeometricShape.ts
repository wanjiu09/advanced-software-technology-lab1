import { Geometry } from './Geometry.js';
import { Shape } from './Shape.js';

/** Shared numeric behavior; each leaf declares its own attributes and coordinate axes. */
export abstract class GeometricShape extends Shape {
  public constructor(id: string, private readonly geometry: Geometry) {
    super(id);
  }

  public override set(name: string, value: string): void {
    if (this.geometry.has(name)) {
      this.geometry.set(name, value);
    } else {
      super.set(name, value);
    }
  }

  public override validateMove(dx: number, dy: number): void {
    this.geometry.validateMove(dx, dy);
  }

  public override move(dx: number, dy: number): void {
    this.geometry.move(dx, dy);
  }

  public override validateScale(factor: number): void {
    this.geometry.validateScale(factor);
  }

  public override scale(factor: number): void {
    this.geometry.scale(factor);
  }

  protected override geometryAttributes(): Readonly<Record<string, string>> {
    return this.geometry.attributes;
  }

  protected number(name: string): number {
    return this.geometry.get(name);
  }
}
