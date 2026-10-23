import { Geometry } from '../domain/Geometry.js';

/** Resolves inherited presentation before transforms are flattened into leaf geometry. */
export class SvgPresentation {
  public constructor(
    private readonly strokeValue = 'none',
    private readonly strokeWidthValue = 1,
    private readonly fontSizeValue: number | undefined = undefined,
  ) {}

  public get stroke(): string { return this.strokeValue; }
  public get strokeWidth(): number { return this.strokeWidthValue; }

  public inherit(attributes: Readonly<Record<string, string>>): SvgPresentation {
    const stroke = attributes.stroke;
    const width = attributes['stroke-width'];
    const font = attributes['font-size'];
    let size = this.fontSizeValue;
    if (font !== undefined && font !== 'inherit') {
      const value = Geometry.parseNumber(font.replace(/(?:px|em|%)$/u, ''), 'font-size');
      if (font.endsWith('em') || font.endsWith('%')) {
        if (size !== undefined) size *= font.endsWith('%') ? value / 100 : value;
      } else size = value;
      if (size !== undefined) Geometry.requireNonNegative(size, 'font-size');
    }
    return new SvgPresentation(
      stroke === undefined || stroke === 'inherit' ? this.strokeValue : stroke,
      width === undefined ? this.strokeWidthValue : Geometry.parseNumber(width, 'stroke-width'),
      size,
    );
  }

  public scaledFontSize(factor: number, ownSize?: string): string {
    if (this.fontSizeValue !== undefined) {
      return String(Geometry.requireNonNegative(this.fontSizeValue * factor, 'font-size'));
    }
    // Keep an unspecified browser font relative to its parent, rather than assuming 16px.
    const ownRatio = ownSize === undefined || ownSize === 'inherit' ? 1
      : Geometry.parseNumber(ownSize.replace(/(?:em|%)$/u, ''), 'font-size') / (ownSize.endsWith('%') ? 100 : 1);
    return `${Geometry.requireNonNegative(ownRatio * factor, 'font-size')}em`;
  }
}
