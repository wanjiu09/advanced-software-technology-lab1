import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const entry = fileURLToPath(new URL('../src/bootstrap/main.js', import.meta.url));
function replay(lines: readonly string[]): string {
  const result = spawnSync(process.execPath, [entry], {
    input: lines.join('\n'), encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.error, undefined); assert.equal(result.status, 0); assert.equal(result.stderr, '');
  return result.stdout;
}

test('actual CLI edits a nested node, undoes/redoes, changes text and restores a deleted group', () => {
  const output = replay(['init', 'create g node', 'create rect r 10 20 100 50 red in node',
    'create text t 20 40 "开始" in node', 'move node 0 100', 'show r', 'undo', 'show r',
    'redo', 'scale node 2', 'set t text "处理数据 v2"', 'show t', 'delete node', 'tree',
    'undo', 'tree', 'redo', 'tree']);
  assert.equal(output.includes('error:'), false);
  assert.match(output, /g#node moved by \(0,100\)/);
  assert.match(output, /y=120/); assert.match(output, /y=20/);
  assert.match(output, /text="处理数据 v2"/);
  assert.match(output, /g#node deleted/);
  assert.match(output, /rect#r x=20 y=240 w=200 h=100 fill=red/);
});

test('CLI syntax failures, bad numbers, quotes and queries do not discard redo', () => {
  const output = replay(['init', 'create rect r 10 20 100 50', 'move r 1 2', 'undo',
    'move r 1', 'scale r 0', 'set r unknown 2', 'set r x NaN', 'delete absent',
    'set r fill "unfinished', 'help', 'canvas', 'tree', 'show r', 'redo', 'show r',
    'undo extra', 'redo extra', 'set r fill', 'delete r extra', 'scale r 1 extra',
    'move r 1 2 extra', 'undo', 'show r']);
  assert.match(output, /error: usage: move/);
  assert.match(output, /error: scale factor must be positive/);
  assert.match(output, /error: unknown attribute: unknown/);
  assert.match(output, /error: no such shape: absent/);
  assert.match(output, /error: unterminated double quote/);
  assert.match(output, /redone: rect#r moved by/);
  assert.match(output, /x=11/); assert.match(output, /y=22/);
  assert.equal(output.includes('nothing to redo'), false);
});

test('CLI enforces IO barriers and creates a fresh history after a successful edit', () => {
  const output = replay(['undo', 'redo', 'init', 'undo', 'redo',
    'create rect r 0 0 10 20', 'move r 1 2', 'undo', 'canvas 400 300', 'undo', 'redo',
    'move r bad 2', 'undo', 'set r fill blue', 'undo', 'undo', 'redo', 'show r', 'init', 'redo']);
  assert.match(output, /error: no document\. use 'init' or 'read' first/);
  assert.equal(output.match(/error: undo not allowed after io command/g)?.length, 6);
  assert.match(output, /error: nothing to undo/);
  assert.match(output, /redone: rect#r updated: fill="blue"/);
  assert.match(output, /fill=blue/);
});

test('all six types accept reversible styles, and empty text can be restored', () => {
  const output = replay(['init', 'create g g', 'create rect r 0 0 1 2 in g',
    'create circle c 1 2 3 in g', 'create ellipse e 1 2 3 4 in g',
    'create line l 1 2 3 4 black in g', 'create text t 1 2 "原文" in g',
    'set g stroke-width 2', 'set c fill red', 'undo', 'redo', 'set t text ""',
    'show t', 'undo', 'show t', 'delete g', 'undo', 'tree']);
  assert.equal(output.includes('error:'), false);
  assert.match(output, /text=""/); assert.match(output, /text="原文"/);
  assert.match(output, /circle#c cx=1 cy=2 r=3 fill=red/);
  assert.match(output, /line#l x1=1 y1=2 x2=3 y2=4 stroke=black/);
  assert.match(output, /g#g stroke-width=2/);
});
