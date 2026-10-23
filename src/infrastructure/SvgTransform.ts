import { Geometry } from '../domain/Geometry.js';
import type { Shape } from '../domain/Shape.js';

/** Positive uniform affine subset. Unsupported visual changes are rejected explicitly. */
export class SvgTransform {
  public constructor(private readonly scale = 1, private readonly x = 0, private readonly y = 0) {
    Geometry.requirePositive(scale, 'transform scale');
    Geometry.requireFinite(x, 'transform x'); Geometry.requireFinite(y, 'transform y');
  }

  public static parse(source: string): SvgTransform {
    source = source.trim();
    let result = new SvgTransform();
    const expression = /\s*(translate|scale)\s*\(([^()]*)\)\s*/gy;
    let position = 0;
    while (position < source.length) {
      expression.lastIndex = position;
      const match = expression.exec(source);
      if (match === null) throw new Error(`unsupported transform: ${source}`);
      const raw = match[2]!.trim();
      if (!raw || /,\s*,|^,|,$/u.test(raw)) throw new Error(`invalid transform: ${source}`);
      const values = raw.split(/[\s,]+/u).map((value) => Geometry.parseNumber(value, 'transform'));
      if (values.length < 1 || values.length > 2) throw new Error(`invalid transform: ${source}`);
      const first = values[0]!;
      if (match[1] === 'translate') result = result.compose(new SvgTransform(1, first, values[1] ?? 0));
      else {
        if (values.length === 2 && values[1] !== first) throw new Error('non-uniform scale is unsupported');
        result = result.compose(new SvgTransform(first));
      }
      position = expression.lastIndex;
    }
    return result;
  }

  public compose(local: SvgTransform): SvgTransform {
    return new SvgTransform(this.scale * local.scale, this.x + this.scale * local.x, this.y + this.scale * local.y);
  }

  public apply(shape: Shape, stroke: string): void {
    if (shape.isContainer) return;
    if (this.scale !== 1) {
      if (shape.text !== undefined || stroke !== 'none') {
        throw new Error('scaled text or strokes cannot be imported losslessly');
      }
      shape.scale(this.scale);
    }
    shape.move(this.x, this.y);
  }
}
