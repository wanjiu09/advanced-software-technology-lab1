import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';
import { FailingEditCommand } from './support/FailingEditCommand.js';

function scene(): EditorSession {
  const session = new EditorSession(); session.initialize();
  session.create('g', 'scene', []); session.create('g', 'node', [], 'scene');
  session.create('rect', 'r', ['10', '20', '100', '50', 'red'], 'node');
  session.create('text', 't', ['20', '40', '开始'], 'node');
  session.create('circle', 'last', ['200', '100', '20'], 'scene');
  return session;
}

test('all new application operations require a document', () => {
  const session = new EditorSession();
  for (const action of [() => session.move('r', '1', '2'), () => session.scale('r', '2'),
    () => session.set('r', 'fill', 'blue'), () => session.delete('r'), () => session.undo(), () => session.redo()]) {
    assert.throws(action, { message: "no document. use 'init' or 'read' first" });
  }
});

test('each geometric edit is one unit and restores its exact before/after document', () => {
  const session = scene();
  const edits = [() => session.move('r', '3.5', '-4'), () => session.scale('r', '0.5'),
    () => session.set('r', 'width', '40'), () => session.set('r', 'stroke-width', '2'),
    () => session.set('t', 'text', '处理数据 v2'), () => session.delete('last')];
  for (const edit of edits) {
    const before = session.tree(); edit(); const after = session.tree();
    assert.notDeepEqual(after, before);
    session.undo(); assert.deepEqual(session.tree(), before);
    session.redo(); assert.deepEqual(session.tree(), after);
  }
});

test('nested group move/scale use Composite behavior and undo as a single operation', () => {
  const session = scene(); const before = session.tree();
  session.move('node', '0', '100');
  assert.equal(session.show('r').attributes.y, '120');
  assert.equal(session.show('t').attributes.y, '140');
  assert.equal(session.show('last').attributes.cy, '100');
  session.undo(); assert.deepEqual(session.tree(), before); session.redo();
  const moved = session.tree(); session.scale('scene', '2');
  assert.equal(session.show('r').attributes.y, '240');
  assert.equal(session.show('r').attributes.width, '200');
  assert.equal(session.show('last').attributes.r, '40');
  session.undo(); assert.deepEqual(session.tree(), moved);
});

test('group styles remain inherited and text accepts empty content through history', () => {
  const session = scene(); session.set('node', 'fill', 'blue');
  assert.equal(session.show('node').attributes.fill, 'blue');
  assert.equal(session.show('r').attributes.fill, 'red');
  assert.equal(session.show('t').attributes.fill, undefined);
  session.set('t', 'text', ''); assert.equal(session.show('t').text, '');
  session.undo(); assert.equal(session.show('t').text, '开始');
  session.undo(); assert.equal(session.show('node').attributes.fill, undefined);
});

test('delete group removes and restores every descendant, parent and sibling order in one unit', () => {
  const session = scene(); const before = session.tree();
  session.delete('node');
  for (const id of ['node', 'r', 't']) assert.throws(() => session.show(id));
  assert.deepEqual(session.tree('scene').children.map((s) => s.id), ['last']);
  session.undo(); assert.deepEqual(session.tree(), before);
  assert.equal(session.show('r').parent, 'g#node');
  session.redo(); assert.throws(() => session.show('r'));
  session.undo(); session.move('r', '1', '2');
  assert.equal(session.show('r').attributes.x, '11');
  assert.throws(() => session.redo(), { message: 'nothing to redo' });
});

test('successful branch edit clears redo, and undoing creation permits reuse of its ID', () => {
  const session = new EditorSession(); session.initialize();
  session.create('rect', 'r', ['1', '2', '3', '4']); session.undo();
  session.create('circle', 'r', ['3', '4', '5']);
  assert.equal(session.show('r').tagName, 'circle');
  assert.throws(() => session.redo(), { message: 'nothing to redo' });
  session.undo(); assert.deepEqual(session.tree().children, []);
  session.redo(); assert.equal(session.show('r').tagName, 'circle');
});

test('failed edits, parameters, init and canvas preserve state and the redo branch', () => {
  const session = scene(); session.move('r', '10', '20'); const after = session.tree();
  session.undo(); const before = session.tree();
  const failures = [
    () => session.move('missing', '1', '2'), () => session.move('r', 'NaN', '0'),
    () => session.scale('r', '0'), () => session.scale('node', '-1'),
    () => session.scale('r', 'Infinity'), () => session.set('r', 'r', '2'),
    () => session.set('r', 'width', '-1'), () => session.delete('missing'),
    () => session.create('g', 'r', []), () => session.canvas('2', '-1'),
    () => session.initialize('2', '0'), () => session.executeEdit(new FailingEditCommand(session)),
  ];
  for (const fail of failures) {
    assert.throws(fail); assert.deepEqual(session.tree(), before);
    session.redo(); assert.deepEqual(session.tree(), after);
    session.undo(); assert.deepEqual(session.tree(), before);
  }
});

test('queries preserve redo while successful init and canvas changes impose barriers', () => {
  const session = scene(); session.move('r', '1', '2'); session.undo();
  session.canvas(); session.tree(); session.show('r');
  session.redo(); assert.equal(session.show('r').attributes.x, '11');
  session.undo(); session.canvas('400', '300'); const resized = session.tree();
  for (const action of [() => session.undo(), () => session.redo()]) {
    assert.throws(action, { message: 'undo not allowed after io command' });
  }
  assert.throws(() => session.delete('missing'));
  assert.throws(() => session.undo(), { message: 'undo not allowed after io command' });
  session.move('r', '1', '2'); session.undo(); assert.deepEqual(session.tree(), resized);
  assert.throws(() => session.undo(), { message: 'nothing to undo' });
  session.initialize();
  assert.throws(() => session.redo(), { message: 'undo not allowed after io command' });
  session.create('g', 'new', []); session.undo();
  assert.deepEqual(session.tree().children, []);
});

test('overflow in a late group descendant preserves both the tree and earlier command history', () => {
  const session = scene(); session.create('line', 'huge', ['1', '2', String(Number.MAX_VALUE), '4'], 'node');
  const before = session.tree(); assert.throws(() => session.scale('node', '2'));
  assert.deepEqual(session.tree(), before); session.undo();
  assert.throws(() => session.show('huge'));
  session.redo(); assert.deepEqual(session.tree(), before);
});
