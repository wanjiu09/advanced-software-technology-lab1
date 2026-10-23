import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { MemorySvgStorage } from './support/MemorySvgStorage.js';
const factory = new ShapeFactory();

function setup(): { session: EditorSession; storage: MemorySvgStorage } {
  const storage = new MemorySvgStorage();
  const session = new EditorSession(factory, storage); session.initialize();
  session.create('rect', 'r', ['1', '2', '3', '4']);
  return { session, storage };
}

test('save requires a document and first save requires an explicit path', async () => {
  const storage = new MemorySvgStorage(); const session = new EditorSession(factory, storage);
  await assert.rejects(session.save('x.svg'), /no document/);
  session.initialize(); await assert.rejects(session.save(), /no file path/);
  assert.throws(() => session.undo(), { message: 'undo not allowed after io command' });
});

test('save remembers only successful paths, read remembers its path, and init resets it', async () => {
  const { session, storage } = setup();
  await session.save('first.svg');
  await session.save(); assert.deepEqual(storage.writes, ['first.svg', 'first.svg']);
  storage.failNextWrite(); await assert.rejects(session.save('bad.svg'));
  await session.save(); assert.equal(storage.writes.at(-1), 'first.svg');
  const incoming = new SvgDocument(10, 20); incoming.add(factory.create('text', 't', { text: '开始' }));
  storage.seed('input.svg', incoming); await session.read('input.svg');
  assert.equal(session.show('t').text, '开始'); assert.deepEqual(session.canvas(), { width: 10, height: 20 });
  await session.save(); assert.equal(storage.writes.at(-1), 'input.svg');
  session.initialize(); await assert.rejects(session.save(), /no file path/);
});

test('failed read and save preserve document, current path and the redo branch', async () => {
  const { session, storage } = setup(); await session.save('good.svg');
  session.move('r', '10', '20'); const after = session.tree(); session.undo(); const before = session.tree();
  storage.failNextRead(); await assert.rejects(session.read('bad.svg'));
  assert.deepEqual(session.tree(), before); session.redo(); assert.deepEqual(session.tree(), after); session.undo();
  storage.failNextWrite(); await assert.rejects(session.save('other.svg'));
  assert.deepEqual(session.tree(), before); session.redo(); assert.deepEqual(session.tree(), after); session.undo();
  await session.save(); assert.equal(storage.writes.at(-1), 'good.svg');
});

test('successful file IO clears both stacks and blocks until the next successful edit', async () => {
  const { session, storage } = setup(); storage.seed('input.svg', session.requireDocument());
  for (const io of [() => session.save('out.svg'), () => session.read('input.svg')]) {
    session.move('r', '1', '2'); session.undo(); await io();
    for (const action of [() => session.undo(), () => session.redo()]) {
      assert.throws(action, { message: 'undo not allowed after io command' });
    }
    assert.throws(() => session.delete('missing'));
    assert.throws(() => session.undo(), { message: 'undo not allowed after io command' });
    const before = session.tree(); session.set('r', 'fill', 'red'); session.undo();
    assert.deepEqual(session.tree(), before); assert.throws(() => session.undo(), { message: 'nothing to undo' });
  }
});

test('pending IO excludes edits, reinitialization, history actions and other IO', async () => {
  const { session, storage } = setup(); storage.pauseNextWrite();
  const saving = session.save('out.svg');
  for (const action of [() => session.initialize(), () => session.canvas('10', '20'),
    () => session.move('r', '1', '2'), () => session.undo(), () => session.redo()]) {
    assert.throws(action, { message: 'io operation in progress' });
  }
  await assert.rejects(session.read('other.svg'), /io operation in progress/);
  await assert.rejects(session.save('other.svg'), /io operation in progress/);
  assert.equal(session.show('r').attributes.x, '1'); session.canvas();
  storage.resumeWrite(); await saving;
  session.move('r', '1', '2'); assert.equal(session.show('r').attributes.x, '2');
  assert.equal((await storage.read('out.svg')).document.find('r').attributes.x, '1');
});

test('failed first read leaves the session uninitialized and releases its IO guard', async () => {
  const storage = new MemorySvgStorage(); const session = new EditorSession(factory, storage);
  await assert.rejects(session.read('missing.svg'), { message: 'cannot read file: missing.svg' });
  assert.throws(() => session.tree(), /no document/);
  session.initialize(); session.create('g', 'g', []); assert.equal(session.show('g').id, 'g');
});
