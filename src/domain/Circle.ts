import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';

export class Circle extends GeometricShape {
  public constructor(id: string, cx = 0, cy = 0, r = 0) {
    super(id, new Geometry({ cx, cy, r }, ['cx'], ['cy'], ['r']));
  }

  public override get tagName(): string {
    return 'circle';
  }

  public override copy(): Circle {
    return this.copyStylesTo(new Circle(
      this.id, this.number('cx'), this.number('cy'), this.number('r'),
    ));
  }
}
