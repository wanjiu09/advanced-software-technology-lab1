import type { ShapeView } from '../application/ShapeView.js';

export class ShapePresenter {
  public tree(view: ShapeView): readonly string[] {
    const lines = [view.id === undefined
      ? `svg (${view.attributes.width}x${view.attributes.height})`
      : this.summary(view)];
    this.children(view.children, '', lines);
    return lines;
  }

  public show(view: ShapeView): readonly string[] {
    const geometry = view.geometryNames.map((name) => `${name}=${view.attributes[name]}`).join(' ');
    return [
      `${view.tagName}#${view.id}  parent=${view.parent ?? 'none'}`,
      ...(geometry ? [`  ${geometry}`] : []),
      ...Object.entries(view.attributes).filter(([name]) => name !== 'id' && !view.geometryNames.includes(name))
        .map(([name, value]) => `  ${name}=${value}`),
      ...(view.text === undefined ? [] : [`  text=${JSON.stringify(view.text)}`]),
    ];
  }

  private summary(view: ShapeView): string {
    const paired = view.text !== undefined || view.points.length > 1;
    const properties = Object.entries(view.attributes)
      .filter(([name]) => name !== 'id' && !(paired && view.geometryNames.includes(name)))
      .map(([name, value]) => `${name === 'width' ? 'w' : name === 'height' ? 'h' : name}=${value}`);
    if (paired) properties.unshift(view.points.map(([x, y]) => `(${x},${y})`).join(' -> '));
    if (view.text !== undefined) properties.splice(1, 0, JSON.stringify(view.text));
    return [`${view.tagName}#${view.id}`, ...properties].join(' ');
  }

  private children(views: readonly ShapeView[], prefix: string, lines: string[]): void {
    views.forEach((view, index) => {
      const last = index === views.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${this.summary(view)}`);
      this.children(view.children, `${prefix}${last ? '    ' : '│   '}`, lines);
    });
  }
}
