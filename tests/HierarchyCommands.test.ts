import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';

function scene(): EditorSession {
  const session = new EditorSession(); session.initialize();
  session.create('rect', 'bg', ['0', '0', '800', '600']);
  session.create('g', 'outer', []);
  session.create('g', 'left', [], 'outer');
  session.create('rect', 'a', ['10', '20', '30', '40', 'red'], 'left');
  session.create('text', 'label', ['15', '35', '开始'], 'left');
  session.create('g', 'right', [], 'outer');
  session.create('circle', 'b', ['100', '100', '20'], 'right');
  session.create('rect', 'tail', ['1', '2', '3', '4'], 'outer');
  return session;
}
function ids(session: EditorSession, id?: string): readonly (string | undefined)[] {
  return session.tree(id).children.map((shape) => shape.id);
}
function reversible(session: EditorSession, edit: () => unknown): void {
  const before = session.tree(); edit(); const after = session.tree();
  session.undo(); assert.deepEqual(session.tree(), before);
  session.redo(); assert.deepEqual(session.tree(), after);
}

test('group reversed non-adjacent siblings in document order at the first selected position', () => {
  const session = scene();
  reversible(session, () => session.group('cluster', ['tail', 'left']));
  assert.deepEqual(ids(session, 'cluster'), ['left', 'tail']);
  assert.deepEqual(ids(session, 'outer'), ['cluster', 'right']);
  assert.equal(session.show('cluster').parent, 'g#outer');
  assert.equal(session.show('a').parent, 'g#left');
});

test('cross-parent grouping uses the nearest common container before the first selected branch', () => {
  const session = scene(); const geometry = session.show('a').attributes;
  reversible(session, () => session.group('cluster', ['b', 'a']));
  assert.deepEqual(ids(session, 'outer'), ['cluster', 'left', 'right', 'tail']);
  assert.deepEqual(ids(session, 'cluster'), ['a', 'b']);
  assert.deepEqual(ids(session, 'left'), ['label']);
  assert.deepEqual(ids(session, 'right'), []);
  assert.deepEqual(ids(session), ['bg', 'outer']);
  assert.equal(session.show('a').parent, 'g#cluster');
  assert.deepEqual(session.show('a').attributes, geometry);
});

test('root grouping preserves selected group subtrees and supports a single undo unit', () => {
  const session = scene(); const before = session.tree();
  session.group('root-group', ['outer', 'bg']);
  assert.deepEqual(ids(session), ['root-group']);
  assert.deepEqual(ids(session, 'root-group'), ['bg', 'outer']);
  assert.equal(session.show('label').text, '开始');
  session.undo(); assert.deepEqual(session.tree(), before);
});

test('ungroup promotes all children at the group position and restores exact structure on undo', () => {
  const session = scene(); session.create('rect', 'after', ['0', '0', '1', '2'], 'left');
  session.group('inner', ['a', 'label']);
  session.set('inner', 'fill', 'blue');
  reversible(session, () => session.ungroup('inner'));
  assert.deepEqual(ids(session, 'left'), ['a', 'label', 'after']);
  assert.equal(session.show('label').parent, 'g#left');
  assert.equal(session.show('a').attributes.fill, 'red');
  assert.equal(session.show('label').attributes.fill, undefined);
  assert.throws(() => session.show('inner'));
});

test('ungroup empty nested group removes only that node and is reversible', () => {
  const session = scene(); session.create('g', 'empty', [], 'outer');
  reversible(session, () => session.ungroup('empty'));
  assert.deepEqual(ids(session, 'outer'), ['left', 'right', 'tail']);
});

test('ungroup top-level groups including an empty group is forbidden', () => {
  const session = scene(); session.create('g', 'empty', []);
  for (const id of ['outer', 'empty']) {
    const before = session.tree();
    assert.throws(() => session.ungroup(id), { message: `cannot ungroup top-level container: ${id}` });
    assert.deepEqual(session.tree(), before);
  }
});

test('addto reparents a whole subtree as the last child without modifying geometry or text', () => {
  const session = scene();
  reversible(session, () => session.addto('right', 'left'));
  assert.deepEqual(ids(session, 'right'), ['b', 'left']);
  assert.deepEqual(ids(session, 'outer'), ['right', 'tail']);
  assert.equal(session.show('left').parent, 'g#right');
  assert.equal(session.show('a').parent, 'g#left');
  assert.equal(session.show('a').attributes.x, '10');
  assert.equal(session.show('label').text, '开始');
});

test('addto an existing parent moves the shape to its end and can be undone', () => {
  const session = scene();
  reversible(session, () => session.addto('outer', 'left'));
  assert.deepEqual(ids(session, 'outer'), ['right', 'tail', 'left']);
});

test('front and back affect only sibling order, with front being last in SVG paint order', () => {
  const session = scene(); const root = ids(session);
  reversible(session, () => session.front('left'));
  assert.deepEqual(ids(session, 'outer'), ['right', 'tail', 'left']);
  reversible(session, () => session.back('left'));
  assert.deepEqual(ids(session, 'outer'), ['left', 'right', 'tail']);
  assert.deepEqual(ids(session), root);
  reversible(session, () => session.front('bg'));
  assert.deepEqual(ids(session), ['outer', 'bg']);
  reversible(session, () => session.back('outer'));
  assert.deepEqual(ids(session), ['outer', 'bg']);
});

test('an already-front or already-last addto is still exactly one editing history unit', () => {
  const session = scene(); const before = session.tree();
  session.front('tail'); session.undo(); assert.deepEqual(session.tree(), before);
  session.redo(); session.addto('outer', 'tail');
  session.undo(); assert.deepEqual(session.tree(), before);
});

test('selection conflicts in either parameter order reject the ancestor with the prescribed error', () => {
  const session = scene();
  for (const selected of [['a', 'left'], ['left', 'a'], ['label', 'outer']]) {
    const ancestor = selected.includes('outer') ? 'outer' : 'left';
    const before = session.tree();
    assert.throws(() => session.group('bad', selected),
      { message: `cannot group a container into its own descendant: ${ancestor}` });
    assert.deepEqual(session.tree(), before);
  }
});

test('failed structure commands preserve both document and an existing redo branch', () => {
  const session = scene(); session.move('a', '5', '10'); const after = session.tree();
  session.undo(); const before = session.tree();
  const cases: readonly [() => unknown, string][] = [
    [() => session.group('outer', ['a', 'b']), 'id already exists: outer'],
    [() => session.group('new', ['a', 'a']), 'duplicate shape id: a'],
    [() => session.group('new', ['a', 'missing']), 'no such shape: missing'],
    [() => session.group('new', ['a']), 'group requires at least two shapes'],
    [() => session.group('', ['a', 'b']), 'invalid id: '],
    [() => session.addto('a', 'b'), 'not a container: a'],
    [() => session.addto('missing', 'a'), 'no such container: missing'],
    [() => session.addto('left', 'missing'), 'no such shape: missing'],
    [() => session.addto('left', 'outer'), 'cannot add a shape into its own descendant: outer'],
    [() => session.addto('left', 'left'), 'cannot add a shape into its own descendant: left'],
    [() => session.ungroup('a'), 'not a container: a'],
    [() => session.ungroup('missing'), 'no such shape: missing'],
    [() => session.front('missing'), 'no such shape: missing'],
    [() => session.back('missing'), 'no such shape: missing'],
  ];
  for (const [action, message] of cases) {
    assert.throws(action, { message }); assert.deepEqual(session.tree(), before);
    session.redo(); assert.deepEqual(session.tree(), after);
    session.undo(); assert.deepEqual(session.tree(), before);
  }
});

test('success after undo discards redo and operations resolve fresh nodes after snapshots', () => {
  const session = scene(); session.group('cluster', ['b', 'a']); session.undo();
  session.addto('left', 'b');
  assert.throws(() => session.redo(), { message: 'nothing to redo' });
  session.group('cluster', ['b', 'a']); session.ungroup('cluster');
  session.front('a'); session.back('b');
  session.move('a', '1', '2');
  assert.equal(session.show('a').attributes.x, '11');
  assert.equal(session.show('b').parent, 'g#left');
});

test('case-sensitive group IDs and nested multi-level common parents are handled without a root move', () => {
  const session = scene(); session.create('g', 'deep', [], 'left');
  session.create('rect', 'r', ['0', '0', '1', '2'], 'deep');
  session.group('Cluster', ['label', 'r']);
  assert.deepEqual(ids(session, 'left'), ['a', 'Cluster', 'deep']);
  assert.deepEqual(ids(session, 'Cluster'), ['label', 'r']);
  assert.equal(session.show('Cluster').parent, 'g#left');
  session.group('cluster', ['b', 'tail']);
  assert.equal(session.show('cluster').parent, 'g#outer');
});

test('all five structural operations require an initialized document', () => {
  const session = new EditorSession();
  for (const action of [() => session.group('g', ['a', 'b']), () => session.ungroup('g'),
    () => session.addto('g', 'a'), () => session.front('a'), () => session.back('a')]) {
    assert.throws(action, { message: "no document. use 'init' or 'read' first" });
  }
});
