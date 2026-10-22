import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Circle } from '../src/domain/Circle.js';
import { Ellipse } from '../src/domain/Ellipse.js';
import { Group } from '../src/domain/Group.js';
import { Line } from '../src/domain/Line.js';
import { Rect } from '../src/domain/Rect.js';
import type { Shape } from '../src/domain/Shape.js';
import { Text } from '../src/domain/Text.js';

const examples: readonly {
  make: () => Shape;
  moved: Readonly<Record<string, string>>;
  scaled: Readonly<Record<string, string>>;
}[] = [
  { make: () => new Rect('rect', 10, 20, 100, 50),
    moved: { id: 'rect', x: '13', y: '16', width: '100', height: '50' },
    scaled: { id: 'rect', x: '6.5', y: '8', width: '50', height: '25' } },
  { make: () => new Circle('circle', 10, 20, 5),
    moved: { id: 'circle', cx: '13', cy: '16', r: '5' },
    scaled: { id: 'circle', cx: '6.5', cy: '8', r: '2.5' } },
  { make: () => new Ellipse('ellipse', -2.5, 4, 3, 6),
    moved: { id: 'ellipse', cx: '0.5', cy: '0', rx: '3', ry: '6' },
    scaled: { id: 'ellipse', cx: '0.25', cy: '0', rx: '1.5', ry: '3' } },
  { make: () => new Line('line', -10, -20, 30, 40),
    moved: { id: 'line', x1: '-7', y1: '-24', x2: '33', y2: '36' },
    scaled: { id: 'line', x1: '-3.5', y1: '-12', x2: '16.5', y2: '18' } },
  { make: () => new Text('text', 10, 20, 'My Diagram 开始'),
    moved: { id: 'text', x: '13', y: '16' },
    scaled: { id: 'text', x: '6.5', y: '8' } },
];

for (const example of examples) {
  const name = example.make().tagName;
  test(`${name} moves and scales its geometry through the Shape interface`, () => {
    const shape: Shape = example.make();
    shape.move(3, -4);
    assert.deepEqual(shape.attributes, example.moved);
    shape.scale(0.5);
    assert.deepEqual(shape.attributes, example.scaled);
  });
}

test('common style attributes work for every leaf and group and stroke width is not scaled', () => {
  for (const shape of [...examples.map((example) => example.make()), new Group('g')]) {
    shape.set('fill', '#3366ff');
    shape.set('stroke', 'black');
    shape.set('stroke-width', '2.5');
    shape.scale(2);
    assert.equal(shape.attributes.fill, '#3366ff');
    assert.equal(shape.attributes.stroke, 'black');
    assert.equal(shape.attributes['stroke-width'], '2.5');
    const before = shape.attributes;
    for (const value of ['-1', 'NaN', 'Infinity', '2px', '']) {
      assert.throws(() => shape.set('stroke-width', value));
      assert.deepEqual(shape.attributes, before);
    }
  }
});

test('text content is independent from attributes, supports empty strings and survives transforms', () => {
  const text: Shape = new Text('label', 20, 40, '开始 <处理> & "完成"');
  text.move(10, 5);
  text.scale(2);
  assert.equal(text.text, '开始 <处理> & "完成"');
  assert.equal(Object.hasOwn(text.attributes, 'text'), false);
  text.set('text', '');
  assert.equal(text.text, '');
  assert.deepEqual(text.attributes, { id: 'label', x: '60', y: '90' });
});

test('each type enforces its own attribute whitelist and ids cannot be changed', () => {
  const cases: readonly [Shape, readonly string[]][] = [
    [new Rect('r'), ['r', 'cx', 'text', 'transform']],
    [new Circle('c'), ['x', 'width', 'rx', 'text']],
    [new Ellipse('e'), ['r', 'width', 'text']],
    [new Line('l'), ['x', 'r', 'text']],
    [new Text('t'), ['width', 'font-size', 'label']],
    [new Group('g'), ['x', 'cx', 'text', 'label']],
  ];
  for (const [shape, unknown] of cases) {
    const before = shape.attributes;
    for (const name of [...unknown, 'id', 'Fill']) {
      assert.throws(() => shape.set(name, '1'), { message: `unknown attribute: ${name}` });
      assert.deepEqual(shape.attributes, before);
    }
  }
});

test('changing a geometric attribute validates it atomically and permits zero-sized shapes', () => {
  const shape = new Rect('r', -2, 3, 10, 5);
  shape.set('width', '0');
  shape.set('x', '-2.5');
  const before = shape.attributes;
  assert.throws(() => shape.set('height', '-1'), { message: 'height must be non-negative' });
  assert.throws(() => shape.set('x', '1e999'), { message: 'x must be finite' });
  assert.deepEqual(shape.attributes, before);
  assert.equal(shape.attributes.width, '0');
  assert.equal(shape.attributes.x, '-2.5');
});

test('constructors reject negative lengths and non-finite coordinates', () => {
  const invalid = [
    () => new Rect('r', 0, 0, -1, 10),
    () => new Rect('r', 0, 0, 1, -10),
    () => new Circle('c', 0, 0, -1),
    () => new Ellipse('e', 0, 0, -1, 2),
    () => new Ellipse('e', 0, 0, 1, -2),
    () => new Line('l', 0, 0, Infinity, 0),
    () => new Text('t', NaN, 0),
  ];
  for (const construct of invalid) {
    assert.throws(construct);
  }
  assert.equal(new Circle('zero', 0, 0, 0).attributes.r, '0');
});

test('invalid transforms leave all leaves and empty groups unchanged', () => {
  for (const shape of [...examples.map((example) => example.make()), new Group('empty')]) {
    const before = shape.attributes;
    for (const factor of [0, -1]) {
      assert.throws(() => shape.scale(factor), { message: 'scale factor must be positive' });
    }
    for (const factor of [Infinity, NaN]) {
      assert.throws(() => shape.scale(factor));
    }
    assert.throws(() => shape.move(Infinity, 0));
    assert.throws(() => shape.move(0, NaN));
    assert.deepEqual(shape.attributes, before);
  }
});

test('leaf translation and scaling reject overflow without changing earlier coordinates', () => {
  const line = new Line('l', 1, 2, Number.MAX_VALUE, 4);
  const before = line.attributes;
  assert.throws(() => line.move(Number.MAX_VALUE, 0), { message: 'x2 must be finite' });
  assert.deepEqual(line.attributes, before);
  assert.throws(() => line.scale(2), { message: 'x2 must be finite' });
  assert.deepEqual(line.attributes, before);
});

test('nested groups move and scale their descendants without touching unrelated shapes', () => {
  const scene = new Group('scene');
  const node = new Group('node');
  const rect = new Rect('box', 520, 100, 160, 60);
  const label = new Text('label', 545, 135, '处理数据');
  const edge = new Line('edge', 280, 130, 520, 130);
  node.appendChild(rect);
  node.appendChild(label);
  scene.appendChild(node);
  scene.appendChild(edge);
  const target: Shape = node;
  target.move(0, 100);
  assert.equal(rect.attributes.y, '200');
  assert.equal(label.attributes.y, '235');
  assert.equal(edge.attributes.y2, '130');
  const entireScene: Shape = scene;
  entireScene.scale(2);
  assert.deepEqual(rect.attributes, { id: 'box', x: '1040', y: '400', width: '320', height: '120' });
  assert.deepEqual(label.attributes, { id: 'label', x: '1090', y: '470' });
  assert.deepEqual(edge.attributes, { id: 'edge', x1: '560', y1: '260', x2: '1040', y2: '260' });
  assert.equal(label.text, '处理数据');
  assert.deepEqual(scene.attributes, { id: 'scene' });
});

test('a late descendant overflow is detected before any earlier sibling changes', () => {
  const root = new Group('root');
  const nested = new Group('nested');
  const first = new Rect('first', 1, 2, 3, 4);
  const last = new Circle('last', Number.MAX_VALUE, 10, 5);
  root.appendChild(first);
  root.appendChild(nested);
  nested.appendChild(last);
  const before = [first.attributes, last.attributes];
  assert.throws(() => root.move(Number.MAX_VALUE, 0), { message: 'cx must be finite' });
  assert.deepEqual([first.attributes, last.attributes], before);
  assert.throws(() => root.scale(2), { message: 'cx must be finite' });
  assert.deepEqual([first.attributes, last.attributes], before);
});

test('group style is stored on the group without overriding explicit descendant styles', () => {
  const group = new Group('g');
  const plain = new Rect('plain');
  const colored = new Circle('colored');
  colored.set('fill', 'red');
  group.appendChild(plain);
  group.appendChild(colored);
  const target: Shape = group;
  target.set('fill', 'blue');
  assert.equal(group.attributes.fill, 'blue');
  assert.equal(Object.hasOwn(plain.attributes, 'fill'), false);
  assert.equal(colored.attributes.fill, 'red');
});

test('attribute projections are immutable snapshots rather than mutable model fields', () => {
  const shape = new Rect('r', 1, 2, 3, 4);
  const attributes = shape.attributes;
  assert.throws(() => { (attributes as Record<string, string>).x = '999'; }, TypeError);
  shape.move(1, 0);
  assert.equal(attributes.x, '1');
  assert.equal(shape.attributes.x, '2');
});

test('polymorphic copies preserve geometry, text and styles and never share mutable state', () => {
  for (const original of examples.map((example) => example.make())) {
    original.set('fill', 'red');
    original.set('stroke-width', '2');
    const copy = original.copy();
    assert.notEqual(copy, original);
    assert.equal(copy.tagName, original.tagName);
    assert.deepEqual(copy.attributes, original.attributes);
    assert.equal(copy.text, original.text);
    assert.equal(copy.parent, null);
    const before = original.attributes;
    copy.move(7, 8);
    copy.set('fill', 'blue');
    assert.deepEqual(original.attributes, before);
    assert.equal(original.attributes.fill, 'red');
  }
});

test('group copy recursively preserves order and relinks children to the copied parent', () => {
  const original = new Group('root');
  const nested = new Group('nested');
  const label = new Text('label', 10, 20, '开始');
  nested.appendChild(label);
  original.appendChild(new Rect('first'));
  original.appendChild(nested);
  original.set('fill', 'red');
  const copy = original.copy();
  assert.deepEqual(copy.children.map((child) => child.id), ['first', 'nested']);
  const copiedNested = copy.children[1];
  assert.ok(copiedNested);
  const copiedLabel = copiedNested.children[0];
  assert.ok(copiedLabel);
  assert.equal(copy.parent, null);
  assert.equal(copiedNested.parent, copy);
  assert.equal(copiedLabel.parent, copiedNested);
  assert.equal(copy.attributes.fill, 'red');
  copiedLabel.set('text', '完成');
  copy.move(10, 20);
  assert.equal(label.text, '开始');
  assert.equal(label.attributes.x, '10');
  assert.equal(label.parent, nested);
});
