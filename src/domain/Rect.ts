import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';

export class Rect extends GeometricShape {
  public constructor(id: string, x = 0, y = 0, width = 0, height = 0) {
    super(id, new Geometry({ x, y, width, height }, ['x'], ['y'], ['width', 'height']));
  }

  public override get tagName(): string {
    return 'rect';
  }

  public override copy(): Rect {
    return this.copyStylesTo(new Rect(
      this.id, this.number('x'), this.number('y'), this.number('width'), this.number('height'),
    ));
  }
}
