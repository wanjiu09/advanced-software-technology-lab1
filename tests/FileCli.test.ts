import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';

const entry = fileURLToPath(new URL('../src/bootstrap/main.js', import.meta.url));
function replay(lines: readonly string[]): string {
  const result = spawnSync(process.execPath, [entry], { input: lines.join('\n'), encoding: 'utf8', timeout: 10000 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0); assert.equal(result.stderr, '');
  return result.stdout;
}

test('actual CLI reads external SVG, prints assigned IDs, saves quoted paths and supports default save', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1 cli '));
  try {
    const input = join(dir, '输入.svg'); const output = join(dir, '输出 file.svg');
    await writeFile(input, '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect/><text id="t">开始 &amp; 结束</text></svg>');
    const result = replay([`read ${JSON.stringify(input)}`, 'tree', `save ${JSON.stringify(output)}`,
      'undo', 'create g g', 'undo', 'redo', 'save', `read ${JSON.stringify(output)}`, 'show t']);
    assert.match(result, /warning: assigned id rect1 to unnamed <rect>/);
    assert.match(result, /error: undo not allowed after io command/);
    assert.equal(result.match(/error:/g)?.length, 1);
    assert.match(result, /text="开始 & 结束"/);
    assert.match(result, /\(3 elements\)/);
    assert.equal(new SvgCodec().decode(await readFile(output, 'utf8')).document.size, 3);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('actual CLI failed read/write preserve redo and default destination', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1-cli-fail-'));
  try {
    const input = join(dir, 'input.svg'); const output = join(dir, 'out.svg'); const bad = join(dir, 'bad.svg');
    await writeFile(input, '<svg width="400" height="300"><rect id="r" x="1" y="2" width="3" height="4"/></svg>');
    await writeFile(bad, '<svg width="10" height="20"><path/></svg>');
    const result = replay([`read ${JSON.stringify(input)}`, `save ${JSON.stringify(output)}`,
      'move r 5 6', 'undo', `read ${JSON.stringify(bad)}`, 'redo', 'undo',
      `save ${JSON.stringify(dir)}`, 'redo', 'save', 'show r']);
    assert.match(result, /error: invalid SVG:/); assert.match(result, /error: cannot write file:/);
    assert.equal(result.match(/redone: rect#r moved by/g)?.length, 2);
    const restored = new SvgCodec().decode(await readFile(output, 'utf8')).document;
    assert.equal(restored.find('r').attributes.x, '6'); assert.equal(restored.find('r').attributes.y, '8');
    assert.equal(new SvgCodec().decode(await readFile(input, 'utf8')).document.find('r').attributes.x, '1');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('file CLI validates arity, requires a document/path, and init resets remembered paths', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1-cli-path-'));
  try {
    const output = join(dir, 'out.svg');
    const result = replay(['save', 'read', 'read one two', 'init', 'save', `save ${JSON.stringify(output)}`,
      'create g g', 'move g 1 2', 'undo', 'save one two', 'redo', 'init', 'save', 'help']);
    assert.match(result, /error: no document/); assert.match(result, /error: usage: read/);
    assert.match(result, /error: usage: save/);
    assert.equal(result.match(/error: no file path/g)?.length, 2);
    assert.match(result, /redone: g#g moved by/);
    assert.equal(result.includes('not implemented'), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
