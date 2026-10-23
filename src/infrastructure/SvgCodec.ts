import { DOMParser, onWarningStopParsing } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import { Geometry } from '../domain/Geometry.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { SvgTransform } from './SvgTransform.js';

export class SvgCodec {
  private readonly namespace = 'http://www.w3.org/2000/svg';
  public constructor(private readonly factory = new ShapeFactory()) {}

  public decode(source: string): Readonly<{ document: SvgDocument; warnings: readonly string[] }> {
    try {
      this.validateCharacters(source);
      if (/<!\s*(?:DOCTYPE|ENTITY)\b/iu.test(source)) throw new Error('DTD and entity declarations are unsupported');
      const declaration = /^\s*<\?xml\s+([^?]*)\?>/u.exec(source)?.[1];
      if (declaration !== undefined) {
        const version = /version\s*=\s*['"]([^'"]+)['"]/u.exec(declaration)?.[1];
        const encoding = /encoding\s*=\s*['"]([^'"]+)['"]/u.exec(declaration)?.[1];
        if (version !== '1.0' || (encoding !== undefined && encoding.toLowerCase() !== 'utf-8')) {
          throw new Error('only XML 1.0 with UTF-8 encoding is supported');
        }
      }
      const xml = new DOMParser({
        onError: onWarningStopParsing,
        normalizeLineEndings: (value) => value.replace(/\r\n?/gu, '\n'),
      }).parseFromString(source, 'application/xml');
      const root = xml.documentElement;
      if (root === null || (root.localName ?? root.tagName) !== 'svg') throw new Error('expected an svg root');
      this.checkNamespace(root);
      for (let i = 0; i < xml.childNodes.length; i += 1) {
        const node = xml.childNodes.item(i)!;
        if (node.nodeType === 7 && node.nodeName !== 'xml') throw new Error('processing instructions are unsupported');
      }
      const attributes = this.attributes(root);
      for (const name of Object.keys(attributes)) {
        if (!['width', 'height', 'viewBox'].includes(name)) throw new Error(`unsupported root attribute: ${name}`);
      }
      const box = attributes.viewBox?.trim().split(/[\s,]+/u).map((value) => Geometry.parseNumber(value, 'viewBox'));
      if (box !== undefined && (box.length !== 4 || box[0] !== 0 || box[1] !== 0)) throw new Error('unsupported viewBox');
      const width = attributes.width === undefined ? box?.[2] : Geometry.parseNumber(attributes.width, 'width');
      const height = attributes.height === undefined ? box?.[3] : Geometry.parseNumber(attributes.height, 'height');
      if (width === undefined || height === undefined) throw new Error('canvas dimensions or viewBox are required');
      if (box !== undefined && (box[2] !== width || box[3] !== height)) throw new Error('scaled viewBox is unsupported');
      const document = new SvgDocument(width, height);
      const reserved = new Set<string>();
      const reserve = (element: Element): void => {
        const id = element.getAttribute('id');
        if (id) {
          if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
          reserved.add(id);
        }
        for (const child of this.elements(element)) reserve(child);
      };
      for (const element of this.elements(root)) reserve(element);
      const warnings: string[] = [];
      const counters = new Map<string, number>();
      const build = (element: Element, parentTransform: SvgTransform, inheritedStroke: string): Shape => {
        this.checkNamespace(element);
        if (element.namespaceURI !== root.namespaceURI) throw new Error('mixed element namespaces are unsupported');
        const attributes = this.attributes(element);
        const type = element.localName ?? element.tagName;
        let id = attributes.id;
        if (!id) {
          let number = counters.get(type) ?? 0;
          do { number += 1; id = `${type}${number}`; } while (reserved.has(id));
          counters.set(type, number); reserved.add(id);
          warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
        }
        delete attributes.id;
        if (Object.hasOwn(attributes, 'text')) throw new Error('text content must be a child text node');
        const transform = parentTransform.compose(SvgTransform.parse(attributes.transform ?? ''));
        delete attributes.transform;
        const shape = this.factory.create(type, id, attributes);
        const children = this.elements(element);
        if (shape.text !== undefined) {
          if (children.length > 0) throw new Error('nested text markup is unsupported');
          this.validateCharacters(element.textContent ?? '');
          shape.set('text', element.textContent ?? '');
        } else {
          for (let i = 0; i < element.childNodes.length; i += 1) {
            const node = element.childNodes.item(i)!;
            if ((node.nodeType === 3 || node.nodeType === 4) && node.nodeValue?.trim()) throw new Error('unexpected character content');
          }
        }
        const ownStroke = shape.attributes.stroke;
        const stroke = ownStroke === undefined || ownStroke === 'inherit' ? inheritedStroke : ownStroke;
        for (const child of children) shape.appendChild(build(child, transform, stroke));
        transform.apply(shape, stroke);
        return shape;
      };
      // Validate root character content and unsupported instructions as well.
      for (let i = 0; i < root.childNodes.length; i += 1) {
        const node = root.childNodes.item(i)!;
        if ((node.nodeType === 3 || node.nodeType === 4) && node.nodeValue?.trim()) throw new Error('unexpected root text');
      }
      for (const element of this.elements(root)) document.add(build(element, new SvgTransform(), 'none'));
      return Object.freeze({ document, warnings: Object.freeze(warnings) });
    } catch (error: unknown) {
      throw new Error(`invalid SVG: ${error instanceof Error ? error.message : 'invalid XML'}`);
    }
  }

  public encode(document: SvgDocument): string {
    const render = (shape: Shape, indent: string): string => {
      const attributes = Object.entries(shape.attributes).map(([name, value]) => `${name}="${this.escape(value, true)}"`).join(' ');
      const open = `${indent}<${shape.tagName} ${attributes}`;
      if (shape.text !== undefined) return `${open}>${this.escape(shape.text)}</${shape.tagName}>`;
      if (shape.children.length === 0) return `${open}/>`;
      return `${open}>\n${shape.children.map((child) => render(child, `${indent}  `)).join('\n')}\n${indent}</${shape.tagName}>`;
    };
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="${this.namespace}" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">\n${document.children.map((shape) => render(shape, '  ')).join('\n')}\n</svg>\n`;
  }

  private elements(element: Element): Element[] {
    const result: Element[] = [];
    for (let i = 0; i < element.childNodes.length; i += 1) {
      const node = element.childNodes.item(i)!;
      if (node.nodeType === 1) result.push(node as Element);
      else if (node.nodeType === 7) throw new Error('processing instructions are unsupported');
    }
    return result;
  }

  private attributes(element: Element): Record<string, string> {
    const result: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let i = 0; i < element.attributes.length; i += 1) {
      const attribute = element.attributes.item(i)!;
      this.validateCharacters(attribute.value);
      if (attribute.namespaceURI === 'http://www.w3.org/2000/xmlns/') continue;
      if (attribute.namespaceURI) throw new Error(`unsupported attribute namespace: ${attribute.name}`);
      result[attribute.name] = attribute.value;
    }
    return result;
  }

  private checkNamespace(element: Element): void {
    if (element.namespaceURI && element.namespaceURI !== this.namespace) throw new Error('unsupported element namespace');
  }

  private validateCharacters(value: string): void {
    if (/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/u.test(value)) {
      throw new Error('invalid XML character');
    }
  }

  private escape(value: string, attribute = false): string {
    this.validateCharacters(value);
    let escaped = value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;').replace(/'/gu, '&apos;').replace(/\r/gu, '&#13;');
    if (attribute) escaped = escaped.replace(/\n/gu, '&#10;').replace(/\t/gu, '&#9;');
    return escaped;
  }
}
