import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';

export class Ellipse extends GeometricShape {
  public constructor(id: string, cx = 0, cy = 0, rx = 0, ry = 0) {
    super(id, new Geometry({ cx, cy, rx, ry }, ['cx'], ['cy'], ['rx', 'ry']));
  }

  public override get tagName(): string {
    return 'ellipse';
  }

  public override copy(): Ellipse {
    return this.copyStylesTo(new Ellipse(
      this.id, this.number('cx'), this.number('cy'), this.number('rx'), this.number('ry'),
    ));
  }
}
