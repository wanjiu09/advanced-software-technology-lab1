import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { Text } from './Text.js';

/** Simple factory shared by application creation and future SVG import. */
export class ShapeFactory {
  // The only shape-type dispatch. Revisit registration when plugins are in scope.
  private readonly creators = new Map<string, (id: string) => Shape>([
    ['rect', (id) => new Rect(id)],
    ['circle', (id) => new Circle(id)],
    ['ellipse', (id) => new Ellipse(id)],
    ['line', (id) => new Line(id)],
    ['text', (id) => new Text(id)],
    ['g', (id) => new Group(id)],
  ]);

  public create(
    type: string,
    id: string,
    attributes: Readonly<Record<string, string>> = {},
  ): Shape {
    const create = this.creators.get(type);
    if (create === undefined) {
      throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    const shape = create(id);
    for (const [name, value] of Object.entries(attributes)) {
      shape.set(name, value);
    }
    return shape;
  }
}
