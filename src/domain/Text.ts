import { GeometricShape } from './GeometricShape.js';
import { Geometry } from './Geometry.js';

export class Text extends GeometricShape {
  public constructor(id: string, x = 0, y = 0, private content = '') {
    super(id, new Geometry({ x, y }, ['x'], ['y']));
  }

  public override get tagName(): string {
    return 'text';
  }

  public override get text(): string {
    return this.content;
  }

  public override set(name: string, value: string): void {
    if (name === 'text') {
      this.content = value;
    } else {
      super.set(name, value);
    }
  }

  public override copy(): Text {
    return this.copyStylesTo(new Text(this.id, this.number('x'), this.number('y'), this.content));
  }
}
