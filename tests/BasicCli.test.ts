import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { CliApplication } from '../src/bootstrap/CliApplication.js';

async function replay(script: string): Promise<string> {
  let transcript = '';
  const output = new Writable({ write(chunk: Buffer, _encoding, callback) {
    transcript += chunk.toString(); callback();
  } });
  await new CliApplication().createRepl(Readable.from([script]), output).run();
  return transcript;
}

test('two-node diagram builds top-down with all six types and inline tree geometry', async () => {
  const output = await replay([
    'init 800 600', 'create g flowchart', 'create g node1 in flowchart',
    'create rect start 120 100 160 60 #4a90d9 in node1',
    'create text start-label 155 135 "开始" in node1',
    'create g node2 in flowchart', 'create rect process 520 100 160 60 #f5a623 in node2',
    'create text process-label 545 135 "处理数据" in node2',
    'create line edge 280 130 520 130 black in flowchart',
    'create circle c 10 20 5 red', 'create ellipse e 10 20 5 6',
    'tree', 'show process-label', 'canvas',
  ].join('\n'));
  assert.equal(output.includes('error:'), false);
  assert.match(output, /canvas 800x600 created/);
  assert.match(output, /rect#start created in g#node1/);
  assert.match(output, /svg \(800x600\)/);
  assert.match(output, /├── g#node1/);
  assert.match(output, /rect#start x=120 y=100 w=160 h=60 fill=#4a90d9/);
  assert.match(output, /text#process-label  parent=g#node2/);
  assert.match(output, /text="处理数据"/);
  assert.match(output, /circle#c cx=10 cy=20 r=5 fill=red/);
  assert.match(output, /ellipse#e cx=10 cy=20 rx=5 ry=6/);
});

test('literal in, empty text, quoted colors and subtree queries are parsed correctly', async () => {
  const output = await replay('init\ncreate g g\ncreate text t 1 2 "in" in g\ncreate text empty 3 4 ""\ncreate rect r 0 0 1 2 "in"\ntree g\nshow empty\nshow r');
  assert.equal(output.includes('error:'), false);
  assert.match(output, /text#t \(1,2\) "in"/);
  assert.match(output, /text=""/);
  assert.match(output, /fill=in/);
});

test('bad input recovers and preserves the active canvas and shapes', async () => {
  const output = await replay([
    'tree', 'canvas', 'show missing', 'create g g', 'init', 'create g g',
    'create rect r 1 2 3 4 in g', 'create rect bad 1 2 3',
    'create g g', 'create g missing-target in missing', 'create g leaf-target in r',
    'create box b', 'canvas 100 -1', 'init 2 0', 'init 1 2 3', 'canvas 10',
    'tree extra args', 'show', 'show r extra', 'create', 'tree',
  ].join('\n'));
  assert.match(output, /error: no document\. use 'init' or 'read' first/);
  assert.match(output, /error: id already exists: g/);
  assert.match(output, /error: no such container: missing/);
  assert.match(output, /error: not a container: r/);
  assert.match(output, /error: unknown shape type: box \(is the plugin loaded\?\)/);
  assert.match(output, /svg \(800x600\)/);
  assert.match(output, /rect#r x=1 y=2 w=3 h=4/);
  assert.equal(output.includes('bad created'), false);
});

test('document initialization and canvas changes support defaults and floating dimensions', async () => {
  const output = await replay('init 400\ncanvas\ncanvas 600.5 300.25\ncanvas\ninit\ncanvas');
  assert.equal(output.includes('error:'), false);
  assert.match(output, /canvas 400x600 created/);
  assert.match(output, /canvas 600.5x300.25 resized/);
  assert.match(output, /canvas 800x600 created/);
});
