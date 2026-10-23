import type { Shape } from './Shape.js';

/** Construction metadata belongs beside the sole type registry, not in CLI branches. */
export class ShapeDefinition {
  public constructor(
    private readonly creator: (id: string) => Shape,
    private readonly required: readonly string[],
    private readonly optional?: string,
  ) {}

  public create(id: string, attributes: Readonly<Record<string, string>>): Shape {
    const shape = this.creator(id);
    for (const [name, value] of Object.entries(attributes)) {
      shape.set(name, value);
    }
    return shape;
  }

  public parameters(values: readonly string[]): Readonly<Record<string, string>> {
    const maximum = this.required.length + (this.optional === undefined ? 0 : 1);
    if (values.length < this.required.length || values.length > maximum) {
      throw new Error(`expected ${this.required.length}${maximum === this.required.length ? '' : ` to ${maximum}`} shape parameters`);
    }
    const names = this.optional === undefined ? this.required : [...this.required, this.optional];
    return Object.freeze(Object.fromEntries(values.map((value, index) => [names[index]!, value])));
  }
}
