/** Immutable query projection; no mutable domain objects cross into CLI. */
export interface ShapeView {
  readonly id: string | undefined;
  readonly tagName: string;
  readonly parent: string | undefined;
  readonly attributes: Readonly<Record<string, string>>;
  readonly text: string | undefined;
  readonly points: readonly (readonly [number, number])[];
  readonly geometryNames: readonly string[];
  readonly children: readonly ShapeView[];
}
