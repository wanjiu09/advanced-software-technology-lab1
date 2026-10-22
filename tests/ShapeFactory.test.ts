import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';

const factory = new ShapeFactory();
const examples: readonly {
  type: string;
  attributes: Readonly<Record<string, string>>;
  expected: Readonly<Record<string, string>>;
  text?: string;
}[] = [
  { type: 'rect', attributes: { x: '10', y: '20', width: '100', height: '50', fill: '#eee' },
    expected: { x: '10', y: '20', width: '100', height: '50', fill: '#eee' } },
  { type: 'circle', attributes: { cx: '100', cy: '100', r: '20', fill: 'red' },
    expected: { cx: '100', cy: '100', r: '20', fill: 'red' } },
  { type: 'ellipse', attributes: { cx: '1', cy: '2', rx: '3', ry: '4' },
    expected: { cx: '1', cy: '2', rx: '3', ry: '4' } },
  { type: 'line', attributes: { x1: '150', y1: '100', x2: '250', y2: '100', stroke: 'black' },
    expected: { x1: '150', y1: '100', x2: '250', y2: '100', stroke: 'black' } },
  { type: 'text', attributes: { x: '20', y: '40', text: '开始 <处理> & "完成"' },
    expected: { x: '20', y: '40' }, text: '开始 <处理> & "完成"' },
  { type: 'g', attributes: { fill: 'blue' }, expected: { fill: 'blue' } },
];

for (const example of examples) {
  test(`factory creates ${example.type} from named attributes`, () => {
    const shape = factory.create(example.type, 'sample', example.attributes);
    assert.equal(shape.tagName, example.type);
    assert.equal(shape.id, 'sample');
    assert.deepEqual(shape.attributes, { id: 'sample', ...example.expected });
    assert.equal(shape.text, example.text);
    assert.equal(shape.parent, null);
  });
}

test('omitted fill and stroke remain absent for every built-in type', () => {
  for (const type of ['rect', 'circle', 'ellipse', 'line', 'text', 'g']) {
    const shape = factory.create(type, 'unstyled');
    assert.equal(Object.hasOwn(shape.attributes, 'fill'), false);
    assert.equal(Object.hasOwn(shape.attributes, 'stroke'), false);
    assert.equal(Object.hasOwn(shape.attributes, 'stroke-width'), false);
  }
});

test('factory rejects unknown types including the deferred box plugin with the required message', () => {
  for (const type of ['hexagon', 'box', 'Rect', '']) {
    assert.throws(() => factory.create(type, 'unknown'),
      { message: `unknown shape type: ${type} (is the plugin loaded?)` });
  }
});

test('factory validates shape-specific attributes instead of silently accepting arbitrary SVG data', () => {
  assert.throws(() => factory.create('rect', 'r', { r: '10' }),
    { message: 'unknown attribute: r' });
  assert.throws(() => factory.create('g', 'g', { x: '10' }),
    { message: 'unknown attribute: x' });
  assert.throws(() => factory.create('rect', 'r', { id: 'other' }),
    { message: 'unknown attribute: id' });
  assert.throws(() => factory.create('circle', 'c', { r: '-1' }),
    { message: 'r must be non-negative' });
});

test('numeric attributes accept signed decimal and scientific notation but not units or coercions', () => {
  const shape = factory.create('rect', 'r', { x: '-.5', y: '+2.5e1', width: '1e2', height: ' 0 ' });
  assert.deepEqual(shape.attributes, { id: 'r', x: '-0.5', y: '25', width: '100', height: '0' });
  for (const value of ['', ' ', '0x10', '10px', 'NaN', 'Infinity', '--1', '1e999']) {
    assert.throws(() => factory.create('rect', 'bad', { x: value }));
  }
});

test('shape identifiers are mandatory, preserve case and reject whitespace or control characters', () => {
  for (const id of ['', 'two words', 'with\ttab', 'with\nnewline', 'null\u0000byte']) {
    assert.throws(() => factory.create('rect', id));
  }
  assert.equal(factory.create('g', '流程图-A').id, '流程图-A');
  assert.equal(factory.create('rect', 'R1').id, 'R1');
});
