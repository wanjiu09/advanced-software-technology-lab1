import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';
import { FailingEditCommand } from './support/FailingEditCommand.js';

const noDocument = { message: "no document. use 'init' or 'read' first" };

test('document-dependent application operations require initialization', () => {
  const session = new EditorSession();
  for (const action of [() => session.canvas(), () => session.tree(), () => session.show('r'),
    () => session.create('rect', 'r', ['0', '0', '1', '1'])]) {
    assert.throws(action, noDocument);
  }
});

test('init defaults, single width, replacement and failed init preserve correct session state', () => {
  const session = new EditorSession();
  session.initialize();
  assert.deepEqual(session.canvas(), { width: 800, height: 600 });
  session.create('g', 'existing', []);
  const before = session.tree();
  assert.throws(() => session.initialize('10', '-1'));
  assert.deepEqual(session.tree(), before);
  session.initialize('400');
  assert.deepEqual(session.canvas(), { width: 400, height: 600 });
  assert.deepEqual(session.tree().children, []);
});

test('canvas query and valid resize preserve shapes while invalid resize is atomic', () => {
  const session = new EditorSession();
  session.initialize();
  session.create('g', 'g', []);
  session.canvas('400.5', '300.25');
  const before = session.tree();
  for (const values of [['1', '0'], ['NaN', '2'], ['3', undefined], [undefined, '2']]) {
    assert.throws(() => session.canvas(values[0], values[1]));
    assert.deepEqual(session.tree(), before);
  }
  assert.deepEqual(session.canvas(), { width: 400.5, height: 300.25 });
  assert.equal(session.show('g').id, 'g');
});

test('create command executes, undoes and redoes a complete nested subtree', () => {
  const session = new EditorSession();
  session.initialize();
  session.create('g', 'scene', []);
  session.create('rect', 'first', ['0', '0', '10', '20'], 'scene');
  const before = session.tree();
  const command = session.prepareCreate('text', 'label', ['5', '10', '开始'], 'scene');
  assert.throws(() => command.undo());
  assert.throws(() => command.redo());
  command.execute();
  assert.equal(command.summary, 'text#label created in g#scene');
  const after = session.tree();
  assert.equal(session.show('label').parent, 'g#scene');
  assert.throws(() => command.execute(), { message: 'command already executed' });
  command.undo();
  assert.deepEqual(session.tree(), before);
  assert.throws(() => command.undo());
  command.redo();
  assert.deepEqual(session.tree(), after);
  assert.throws(() => command.redo());
  command.undo();
  command.redo();
  assert.deepEqual(session.tree(), after);
});

test('failed edits roll back partial geometry, canvas and tree mutations', () => {
  const session = new EditorSession();
  session.initialize();
  session.create('rect', 'r', ['1', '2', '3', '4']);
  const before = session.tree();
  const command = new FailingEditCommand(session);
  assert.throws(() => command.execute(), { message: 'simulated late failure' });
  assert.deepEqual(session.tree(), before);
  assert.throws(() => command.undo());
  assert.throws(() => command.redo());
});

test('command snapshots cannot be applied to a newly initialized document', () => {
  const session = new EditorSession();
  session.initialize();
  const command = session.prepareCreate('g', 'g', []);
  command.execute();
  session.initialize('10', '20');
  assert.throws(() => command.undo(), { message: 'command belongs to another document' });
  assert.deepEqual(session.canvas(), { width: 10, height: 20 });
  assert.deepEqual(session.tree().children, []);
});

test('failed creations preserve the full tree and report assignment-specific errors', () => {
  const session = new EditorSession();
  session.initialize();
  session.create('rect', 'r', ['1', '2', '3', '4']);
  const before = session.tree();
  const cases: readonly [() => unknown, string][] = [
    [() => session.create('g', 'r', []), 'id already exists: r'],
    [() => session.create('g', 'g', [], 'missing'), 'no such container: missing'],
    [() => session.create('g', 'g', [], 'r'), 'not a container: r'],
    [() => session.create('box', 'b', []), 'unknown shape type: box (is the plugin loaded?)'],
    [() => session.create('circle', 'c', ['0', '0', '-1']), 'r must be non-negative'],
  ];
  for (const [action, message] of cases) {
    assert.throws(action, { message });
    assert.deepEqual(session.tree(), before);
  }
});

test('query projections are deeply frozen and remain independent of later edits', () => {
  const session = new EditorSession();
  session.initialize();
  session.create('g', 'g', []);
  const before = session.tree();
  assert.ok(Object.isFrozen(before));
  assert.ok(Object.isFrozen(before.children));
  assert.ok(Object.isFrozen(before.children[0]));
  assert.ok(Object.isFrozen(before.children[0]?.attributes));
  session.create('text', 't', ['0', '0', ''], 'g');
  assert.deepEqual(before.children[0]?.children, []);
  assert.equal(session.show('t').text, '');
});

test('creation schema requires all positional arguments and rejects extras for every type', () => {
  const session = new EditorSession();
  session.initialize();
  const samples = [
    ['rect', ['0', '0', '1', '2']], ['circle', ['0', '0', '1']],
    ['ellipse', ['0', '0', '1', '2']], ['line', ['0', '0', '1', '2']],
    ['text', ['0', '0', 'in']], ['g', []],
  ] as const;
  for (const [type, values] of samples) {
    const before = session.tree();
    if (values.length > 0) assert.throws(() => session.create(type, 'short', values.slice(0, -1)));
    assert.throws(() => session.create(type, 'extra', [...values, 'extra', 'extra']));
    assert.deepEqual(session.tree(), before);
    session.create(type, type, values);
  }
  assert.equal(session.show('text').text, 'in');
  assert.equal(session.show('line').attributes.stroke, undefined);
});
