/** Encapsulates numeric attributes and validates an entire change before applying it. */
export class Geometry {
  private values: Map<string, number>;
  private readonly horizontal: ReadonlySet<string>;
  private readonly vertical: ReadonlySet<string>;
  private readonly lengths: ReadonlySet<string>;

  public constructor(
    attributes: Readonly<Record<string, number>>,
    horizontal: readonly string[],
    vertical: readonly string[],
    lengths: readonly string[] = [],
  ) {
    this.horizontal = new Set(horizontal);
    this.vertical = new Set(vertical);
    this.lengths = new Set(lengths);
    this.values = new Map(Object.entries(attributes));
    this.validate(this.values);
  }

  public static requireFinite(value: number, name: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`${name} must be finite`);
    }
    return value;
  }

  public static requireNonNegative(value: number, name: string): number {
    Geometry.requireFinite(value, name);
    if (value < 0) {
      throw new Error(`${name} must be non-negative`);
    }
    return value;
  }

  public static requirePositive(value: number, name: string): number {
    Geometry.requireFinite(value, name);
    if (value <= 0) {
      throw new Error(`${name} must be positive`);
    }
    return value;
  }

  public static parseNumber(value: string, name: string): number {
    const normalized = value.trim();
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/u.test(normalized)) {
      throw new Error(`invalid number for ${name}: ${value}`);
    }
    return Geometry.requireFinite(Number(normalized), name);
  }

  public get attributes(): Readonly<Record<string, string>> {
    return Object.freeze(Object.fromEntries(
      [...this.values].map(([name, value]) => [name, String(value)]),
    ));
  }

  public has(name: string): boolean {
    return this.values.has(name);
  }

  public get points(): readonly (readonly [number, number])[] {
    const vertical = [...this.vertical];
    return Object.freeze([...this.horizontal].map((name, index) =>
      Object.freeze([this.get(name), this.get(vertical[index]!)] as const)));
  }

  public get(name: string): number {
    const value = this.values.get(name);
    if (value === undefined) {
      throw new Error(`unknown attribute: ${name}`);
    }
    return value;
  }

  public set(name: string, value: string): void {
    if (!this.has(name)) {
      throw new Error(`unknown attribute: ${name}`);
    }
    const next = new Map(this.values);
    next.set(name, Geometry.parseNumber(value, name));
    this.validate(next);
    this.values = next;
  }

  public validateMove(dx: number, dy: number): void {
    this.translated(dx, dy);
  }

  public move(dx: number, dy: number): void {
    this.values = this.translated(dx, dy);
  }

  public validateScale(factor: number): void {
    this.scaled(factor);
  }

  public scale(factor: number): void {
    this.values = this.scaled(factor);
  }

  private translated(dx: number, dy: number): Map<string, number> {
    Geometry.requireFinite(dx, 'dx');
    Geometry.requireFinite(dy, 'dy');
    const next = new Map(this.values);
    for (const [name, value] of next) {
      if (this.horizontal.has(name)) {
        next.set(name, value + dx);
      } else if (this.vertical.has(name)) {
        next.set(name, value + dy);
      }
    }
    this.validate(next);
    return next;
  }

  private scaled(factor: number): Map<string, number> {
    Geometry.requirePositive(factor, 'scale factor');
    const next = new Map([...this.values].map(([name, value]) => [name, value * factor]));
    this.validate(next);
    return next;
  }

  private validate(values: ReadonlyMap<string, number>): void {
    for (const [name, value] of values) {
      if (this.lengths.has(name)) {
        Geometry.requireNonNegative(value, name);
      } else {
        Geometry.requireFinite(value, name);
      }
    }
  }
}
