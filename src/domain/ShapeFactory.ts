import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { ShapeDefinition } from './ShapeDefinition.js';
import { Text } from './Text.js';

/** Simple factory shared by application creation and future SVG import. */
export class ShapeFactory {
  // The only shape-type dispatch. Revisit registration when plugins are in scope.
  private readonly creators = new Map<string, ShapeDefinition>([
    ['rect', new ShapeDefinition((id) => new Rect(id), ['x', 'y', 'width', 'height'], 'fill')],
    ['circle', new ShapeDefinition((id) => new Circle(id), ['cx', 'cy', 'r'], 'fill')],
    ['ellipse', new ShapeDefinition((id) => new Ellipse(id), ['cx', 'cy', 'rx', 'ry'], 'fill')],
    ['line', new ShapeDefinition((id) => new Line(id), ['x1', 'y1', 'x2', 'y2'], 'stroke')],
    ['text', new ShapeDefinition((id) => new Text(id), ['x', 'y', 'text'])],
    ['g', new ShapeDefinition((id) => new Group(id), [])],
  ]);

  public create(
    type: string,
    id: string,
    attributes: Readonly<Record<string, string>> = {},
  ): Shape {
    return this.definition(type).create(id, attributes);
  }

  public parameters(type: string, values: readonly string[]): Readonly<Record<string, string>> {
    return this.definition(type).parameters(values);
  }

  private definition(type: string): ShapeDefinition {
    const definition = this.creators.get(type);
    if (definition === undefined) {
      throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return definition;
  }
}
