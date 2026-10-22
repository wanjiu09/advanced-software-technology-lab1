import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Circle } from '../src/domain/Circle.js';
import { Group } from '../src/domain/Group.js';
import { Rect } from '../src/domain/Rect.js';
import type { Shape } from '../src/domain/Shape.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Text } from '../src/domain/Text.js';

test('new documents use an unaddressed svg root and the required default canvas', () => {
  const document = new SvgDocument();
  assert.equal(document.width, 800);
  assert.equal(document.height, 600);
  assert.equal(document.tagName, 'svg');
  assert.equal(document.id, undefined);
  assert.equal(document.parent, null);
  assert.equal(document.size, 0);
  assert.deepEqual(document.children, []);
});

test('canvas dimensions must be finite and positive and failed resize changes neither dimension', () => {
  const document = new SvgDocument(400.5, 300.25);
  for (const invalid of [0, -1, NaN, Infinity]) {
    assert.throws(() => new SvgDocument(invalid, 600));
    assert.throws(() => new SvgDocument(800, invalid));
    assert.throws(() => document.resize(900, invalid));
    assert.throws(() => document.resize(invalid, 700));
    assert.equal(document.width, 400.5);
    assert.equal(document.height, 300.25);
  }
  document.resize(1000, 700);
  assert.equal(document.width, 1000);
  assert.equal(document.height, 700);
});

test('adding a nested scene preserves parent links, order, depth-first traversal and element count', () => {
  const document = new SvgDocument();
  const scene = new Group('scene');
  const node = new Group('node');
  const box = new Rect('box', 120, 100, 160, 60);
  const label = new Text('label', 155, 135, '开始');
  const background = new Rect('bg');
  document.add(background);
  document.add(scene);
  document.add(node, 'scene');
  document.add(box, 'node');
  document.add(label, 'node');
  assert.equal(scene.parent, document);
  assert.equal(node.parent, scene);
  assert.equal(box.parent, node);
  assert.equal(label.parent, node);
  assert.deepEqual(document.children.map((shape) => shape.id), ['bg', 'scene']);
  assert.deepEqual([...document.descendants()].map((shape) => shape.id),
    ['bg', 'scene', 'node', 'box', 'label']);
  assert.equal(document.size, 5);
  assert.equal(document.find('label'), label);
});

test('ID lookup is global and case sensitive, including groups', () => {
  const document = new SvgDocument();
  const group = new Group('node');
  document.add(group);
  document.add(new Rect('R1'), 'node');
  document.add(new Circle('r1'));
  assert.equal(document.find('node'), group);
  assert.equal(document.find('R1').tagName, 'rect');
  assert.equal(document.find('r1').tagName, 'circle');
  assert.throws(() => document.find('R9'), { message: 'no such shape: R9' });
  assert.throws(() => document.find('Node'), { message: 'no such shape: Node' });
});

test('missing and leaf target containers report the assignment errors before changing ownership', () => {
  const document = new SvgDocument();
  document.add(new Rect('start'));
  const candidate = new Circle('candidate');
  assert.throws(() => document.add(candidate, 'node9'), { message: 'no such container: node9' });
  assert.throws(() => document.add(candidate, 'start'), { message: 'not a container: start' });
  assert.equal(candidate.parent, null);
  assert.equal(document.size, 1);
  assert.deepEqual(document.children.map((shape) => shape.id), ['start']);
});

test('duplicate ids are rejected across containers, including direct edits to an attached group', () => {
  const document = new SvgDocument();
  const left = new Group('left');
  const right = new Group('right');
  document.add(left);
  document.add(right);
  document.add(new Rect('shared'), 'left');
  const duplicate = new Circle('shared');
  assert.throws(() => right.appendChild(duplicate), { message: 'id already exists: shared' });
  assert.equal(duplicate.parent, null);
  assert.equal(document.size, 3);
  assert.deepEqual(right.children, []);
  assert.equal(document.find('shared').tagName, 'rect');
});

test('the container itself participates in uniqueness even before attachment to a document', () => {
  const group = new Group('same');
  const duplicate = new Rect('same');
  assert.throws(() => group.appendChild(duplicate), { message: 'id already exists: same' });
  assert.deepEqual(group.children, []);
  assert.equal(duplicate.parent, null);
});

test('an incoming subtree is fully checked for ID conflicts before any nodes are attached', () => {
  const document = new SvgDocument();
  const existing = new Rect('shared');
  document.add(existing);
  const subtree = new Group('incoming');
  const inner = new Group('inner');
  const duplicate = new Circle('shared');
  inner.appendChild(duplicate);
  subtree.appendChild(inner);
  assert.throws(() => document.add(subtree), { message: 'id already exists: shared' });
  assert.equal(document.size, 1);
  assert.equal(document.find('shared'), existing);
  assert.equal(subtree.parent, null);
  assert.equal(inner.parent, subtree);
  assert.equal(duplicate.parent, inner);
});

test('self-insertion and inserting a detached ancestor into its descendant are rejected atomically', () => {
  const root = new Group('root');
  const nested = new Group('nested');
  root.appendChild(nested);
  assert.throws(() => root.appendChild(root),
    { message: 'cannot add a shape into its own descendant: root' });
  assert.throws(() => nested.appendChild(root),
    { message: 'cannot add a shape into its own descendant: root' });
  assert.equal(root.parent, null);
  assert.equal(nested.parent, root);
  assert.deepEqual(root.children, [nested]);
  assert.deepEqual(nested.children, []);
});

test('a shape cannot silently acquire a second parent in the same or another document', () => {
  const first = new SvgDocument();
  const second = new SvgDocument();
  const group = new Group('group');
  const rect = new Rect('rect');
  first.add(group);
  first.add(rect);
  assert.throws(() => group.appendChild(rect), { message: 'shape already has a parent: rect' });
  assert.throws(() => second.add(rect), { message: 'shape already has a parent: rect' });
  assert.throws(() => second.add(group), { message: 'shape already has a parent: group' });
  assert.equal(rect.parent, first);
  assert.equal(group.parent, first);
  assert.equal(first.size, 2);
  assert.equal(second.size, 0);
});

test('controlled insertion preserves SVG sibling order and rejects invalid indexes without side effects', () => {
  const document = new SvgDocument();
  const a = new Rect('a');
  const b = new Circle('b');
  const c = new Text('c');
  document.appendChild(a);
  document.appendChild(c);
  document.insertChild(b, 1);
  assert.deepEqual(document.children.map((shape) => shape.id), ['a', 'b', 'c']);
  assert.equal(b.parent, document);
  const candidate = new Rect('candidate');
  for (const index of [-1, 4, 0.5, NaN, Infinity]) {
    assert.throws(() => document.insertChild(candidate, index), { message: 'child index out of range' });
    assert.equal(candidate.parent, null);
    assert.deepEqual(document.children.map((shape) => shape.id), ['a', 'b', 'c']);
  }
});

test('leaf nodes reject child mutation and expose no mutable children array', () => {
  const leaf = new Rect('leaf');
  const child = new Circle('child');
  assert.throws(() => leaf.appendChild(child), { message: 'not a container: leaf' });
  assert.throws(() => leaf.removeChild(child), { message: 'not a container: leaf' });
  assert.equal(child.parent, null);
  assert.deepEqual(leaf.children, []);
  assert.throws(() => (leaf.children as Shape[]).push(child), TypeError);
});

test('children queries are immutable snapshots and cannot bypass duplicate-ID validation', () => {
  const group = new Group('g');
  const first = new Rect('first');
  group.appendChild(first);
  const before = group.children;
  assert.throws(() => (before as Shape[]).push(new Circle('first')), TypeError);
  group.appendChild(new Circle('second'));
  assert.deepEqual(before, [first]);
  assert.deepEqual(group.children.map((shape) => shape.id), ['first', 'second']);
});

test('removing a subtree updates parent links and lookup without disturbing its internal structure', () => {
  const document = new SvgDocument();
  const group = new Group('group');
  const nested = new Group('nested');
  const child = new Rect('child');
  group.appendChild(nested);
  nested.appendChild(child);
  document.add(group);
  document.add(new Rect('other'));
  document.removeChild(group);
  assert.equal(group.parent, null);
  assert.equal(nested.parent, group);
  assert.equal(child.parent, nested);
  assert.equal(document.size, 1);
  assert.throws(() => document.find('child'), { message: 'no such shape: child' });
  assert.throws(() => document.find('group'), { message: 'no such shape: group' });
  document.add(new Circle('child'));
  assert.equal(document.find('child').tagName, 'circle');
  assert.deepEqual(document.children.map((shape) => shape.id), ['other', 'child']);
});

test('removing a non-child fails without detaching it from its actual owner', () => {
  const document = new SvgDocument();
  const group = new Group('group');
  const rect = new Rect('rect');
  document.add(group);
  document.add(rect);
  assert.throws(() => group.removeChild(rect), { message: 'shape is not a child: rect' });
  assert.equal(rect.parent, document);
  assert.deepEqual(document.children, [group, rect]);
});

test('explicit detach and reattach allow transfer while preserving descendant ownership', () => {
  const first = new SvgDocument();
  const second = new SvgDocument();
  const group = new Group('group');
  const child = new Rect('child');
  group.appendChild(child);
  first.add(group);
  first.removeChild(group);
  second.add(group);
  assert.equal(first.size, 0);
  assert.equal(second.size, 2);
  assert.equal(group.parent, second);
  assert.equal(child.parent, group);
  assert.equal(second.find('child'), child);
});

test('deep document copies retain dimensions, order and parents without sharing text or geometry', () => {
  const original = new SvgDocument(400, 300);
  const group = new Group('node');
  group.set('fill', 'blue');
  group.appendChild(new Rect('box', 10, 20, 100, 50));
  group.appendChild(new Text('label', 30, 45, '开始'));
  original.add(group);
  original.add(new Circle('last', 200, 100, 20));
  const copy = original.copy();
  assert.equal(copy.width, 400);
  assert.equal(copy.height, 300);
  assert.deepEqual([...copy.descendants()].map((shape) => shape.id), ['node', 'box', 'label', 'last']);
  assert.equal(copy.find('node').parent, copy);
  assert.equal(copy.find('label').parent, copy.find('node'));
  assert.equal(copy.find('node').attributes.fill, 'blue');
  copy.find('node').move(10, 20);
  copy.find('label').set('text', '完成');
  copy.resize(900, 700);
  copy.removeChild(copy.find('last'));
  assert.equal(original.width, 400);
  assert.equal(original.height, 300);
  assert.equal(original.size, 4);
  assert.equal(original.find('box').attributes.x, '10');
  assert.equal(original.find('label').text, '开始');
  assert.equal(original.find('node').parent, original);
});
