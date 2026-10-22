import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';

export class Line extends GeometricShape {
  public constructor(id: string, x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
    super(id, new Geometry({ x1, y1, x2, y2 }, ['x1', 'x2'], ['y1', 'y2']));
  }

  public override get tagName(): string {
    return 'line';
  }

  public override copy(): Line {
    return this.copyStylesTo(new Line(
      this.id, this.number('x1'), this.number('y1'), this.number('x2'), this.number('y2'),
    ));
  }
}
