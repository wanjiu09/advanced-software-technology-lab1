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

test('assignment-style grouping transcript supports editing and full history restoration', () => {
  const output = replay(['init', 'create text title 20 40 "My Diagram"',
    'create circle c1 100 100 20 red', 'create rect box 200 80 60 60 #3366ff',
    'group markers box c1', 'tree', 'move c1 30 0', 'undo', 'redo',
    'set title text "My Diagram v2"', 'undo', 'group bad c1 markers',
    'delete box', 'undo', 'tree', 'ungroup markers']);
  assert.match(output, /g#markers created with 2 children/);
  assert.match(output, /├── circle#c1 cx=100 cy=100 r=20 fill=red/);
  assert.match(output, /└── rect#box x=200 y=80 w=60 h=60 fill=#3366ff/);
  assert.match(output, /error: cannot group a container into its own descendant: markers/);
  assert.match(output, /undone: rect#box deleted/);
  assert.match(output, /error: cannot ungroup top-level container: markers/);
});

test('CLI connects nested ungroup, reparenting and sibling paint order to undo/redo', () => {
  const output = replay(['init', 'create g outer', 'create g left in outer',
    'create g right in outer', 'create rect a 1 2 3 4 in left', 'create text b 5 6 "开始" in left',
    'group inner b a', 'ungroup inner', 'undo', 'redo', 'addto right a',
    'front left', 'back right', 'tree outer', 'show a', 'undo', 'undo', 'undo', 'show a']);
  assert.equal(output.includes('error:'), false);
  assert.match(output, /g#inner ungrouped/);
  assert.match(output, /rect#a moved into g#right/);
  assert.match(output, /g#left moved to front/);
  assert.match(output, /g#right moved to back/);
  assert.match(output, /rect#a  parent=g#right/);
  assert.match(output, /rect#a  parent=g#left/);
  assert.match(output, /text#b x=5 y=6 "开始"/);
});

test('structural syntax and cycle errors preserve a pending redo branch', () => {
  const output = replay(['init', 'create g g', 'create g child in g',
    'create rect r 0 0 10 20 in child', 'move r 1 2', 'undo',
    'group', 'group one r', 'ungroup child extra', 'addto g', 'front r extra', 'back',
    'addto child g', 'addto child child', 'group bad g r', 'group duplicate r r',
    'group g child r', 'redo', 'show r']);
  for (const command of ['group', 'ungroup', 'addto', 'front', 'back']) {
    assert.ok(output.includes(`error: usage: ${command}`));
  }
  assert.match(output, /error: cannot add a shape into its own descendant: g/);
  assert.match(output, /error: duplicate shape id: r/);
  assert.match(output, /error: id already exists: g/);
  assert.match(output, /redone: rect#r moved by/);
  assert.match(output, /x=1/); assert.match(output, /y=2/);
  assert.equal(output.includes('nothing to redo'), false);
});

test('structural CLI operations all require a document and are present in help', () => {
  const output = replay(['group g a b', 'ungroup g', 'addto g a', 'front a', 'back a', 'help']);
  assert.equal(output.match(/error: no document\. use 'init' or 'read' first/g)?.length, 5);
  for (const command of ['group', 'ungroup', 'addto', 'front', 'back']) {
    assert.match(output, new RegExp(`^  ${command} `, 'm'));
  }
});
