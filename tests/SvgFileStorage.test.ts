import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { SvgFileStorage } from '../src/infrastructure/SvgFileStorage.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { EditorSession } from '../src/application/EditorSession.js';

const factory = new ShapeFactory();

test('atomic filesystem save/read supports spaces and leaves no temporary entries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1 files '));
  try {
    const storage = new SvgFileStorage(); const document = new SvgDocument(400, 300);
    document.add(factory.create('text', 't', { text: '开始 & 结束' }));
    const path = join(dir, 'diagram 中文.svg');
    assert.equal(await storage.write(path, document), path);
    await chmod(path, 0o660);
    document.find('t').set('text', 'v2'); await storage.write(path, document);
    assert.equal((await stat(path)).mode & 0o777, 0o660);
    const loaded = await storage.read(path);
    assert.equal(loaded.path, path); assert.equal(loaded.document.find('t').text, 'v2');
    assert.deepEqual(await readdir(dir), ['diagram 中文.svg']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('filesystem failures use prescribed messages and never overwrite existing content', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1-fail-'));
  try {
    const storage = new SvgFileStorage(); const document = new SvgDocument();
    const missing = join(dir, 'missing.svg');
    await assert.rejects(storage.read(missing), { message: `cannot read file: ${missing}` });
    await assert.rejects(storage.write(join(dir, 'missing', 'out.svg'), document), /cannot write file/);
    await assert.rejects(storage.write(dir, document), { message: `cannot write file: ${dir}` });
    const invalid = join(dir, 'invalid.svg');
    await writeFile(invalid, Buffer.from([0xff, 0xfe, 0xff]));
    await assert.rejects(storage.read(invalid), /cannot read file/);
    await rm(invalid);
    const target = join(dir, 'existing.svg'); await writeFile(target, 'original');
    document.add(factory.create('text', 't', { text: 'bad\u0000' }));
    await assert.rejects(storage.write(target, document), /invalid XML character/);
    assert.equal(await readFile(target, 'utf8'), 'original');
    assert.deepEqual(await readdir(dir), ['existing.svg']);
    if (process.getuid?.() !== 0) {
      await chmod(target, 0o400);
      await assert.rejects(storage.write(target, new SvgDocument()), /cannot write file/);
      assert.equal(await readFile(target, 'utf8'), 'original');
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('invalid external XML preserves session contents and redo, and warns only on successful import', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1-import-'));
  try {
    const session = new EditorSession(factory, new SvgFileStorage()); session.initialize();
    session.create('rect', 'r', ['1', '2', '3', '4']); session.move('r', '5', '6');
    const after = session.tree(); session.undo(); const before = session.tree();
    const path = join(dir, 'bad.svg');
    await writeFile(path, '<svg width="10" height="20"><rect/><path/></svg>');
    await assert.rejects(session.read(path), /invalid SVG/);
    assert.deepEqual(session.tree(), before); session.redo(); assert.deepEqual(session.tree(), after);
    await writeFile(path, '<svg width="10" height="20"><rect/></svg>');
    const messages = await session.read(path);
    assert.deepEqual(messages, ['warning: assigned id rect1 to unnamed <rect>', `read ${path} (1 elements)`]);
    assert.equal(session.show('rect1').id, 'rect1');
    assert.throws(() => session.undo(), { message: 'undo not allowed after io command' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
