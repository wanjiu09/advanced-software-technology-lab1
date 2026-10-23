import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';

const entry = fileURLToPath(new URL('../src/bootstrap/main.js', import.meta.url));
const fixture = (name: string) => resolve('tests/fixtures', name);
function replay(lines: readonly string[], cwd: string): string {
  const result = spawnSync(process.execPath, [entry], { cwd, input: `${lines.join('\n')}\n`, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0); assert.equal(result.stderr, '');
  return result.stdout.replaceAll('svg> ', '').trim();
}
const normalized = (text: string) => text.split('\n').map((line) => line.trim().replace(/ {2,}/gu, ' ')).filter(Boolean);

test('assignment section 6 transcript matches its feedback and tree data (ignoring alignment spaces)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1-assignment-'));
  try {
    await copyFile(fixture('task-other.svg'), join(dir, 'other.svg'));
    const output = replay([
      'init 800 600', 'create rect bg 0 0 800 600 #ffffff', 'create text title 20 40 "My Diagram"',
      'create circle c1 100 100 20 red', 'create rect box 200 80 60 60 #3366ff',
      'group markers c1 box', 'tree', 'move c1 30 0', 'undo', 'redo',
      'set title text "My Diagram v2"', 'undo', 'group bad c1 markers',
      'delete box', 'undo', 'save demo.svg', 'undo', 'read other.svg', 'tree',
    ], dir);
    assert.deepEqual(normalized(output), normalized(`
svg-editor 0.1 — type 'help' for commands
canvas 800x600 created
rect#bg created
text#title created
circle#c1 created
rect#box created
g#markers created with 2 children
svg (800x600)
├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff
├── text#title     (20,40) "My Diagram"
└── g#markers
    ├── circle#c1  cx=100 cy=100 r=20 fill=red
    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff
circle#c1 moved to (130,100)
circle#c1 moved back to (100,100)
circle#c1 moved to (130,100)
text#title updated: text="My Diagram v2"
text#title updated: text="My Diagram"
error: cannot group a container into its own descendant: markers
rect#box deleted
rect#box restored into g#markers
saved to demo.svg (5 elements)
error: undo not allowed after io command
warning: assigned id rect1 to unnamed <rect>
read other.svg (7 elements)
svg (400x300)
├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff
├── text#t1        (10,290) "imported"
├── circle#c1      cx=50 cy=50 r=10
├── g#g1
│   ├── rect#r2    x=0 y=0 w=10 h=10
│   └── circle#c2  cx=5 cy=5 r=2
└── ellipse#e1     cx=1 cy=2 rx=3 ry=4
`));
    assert.equal(new SvgCodec().decode(await readFile(join(dir, 'demo.svg'), 'utf8')).document.size, 5);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('show groups geometry on one line and tree uses text coordinates and line endpoints', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1-display-'));
  try {
    const output = replay(['init', 'create g markers', 'create circle c1 100 100 20 red in markers',
      'show c1', 'create text title 20 40 "My Diagram"', 'create line arrow 1 2 3 4 black', 'tree'], dir);
    assert.ok(output.includes('circle#c1  parent=g#markers\n  cx=100 cy=100 r=20\n  fill=red'));
    assert.ok(output.includes('text#title (20,40) "My Diagram"'));
    assert.ok(output.includes('line#arrow (1,2) -> (3,4) stroke=black'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('assignment background imports, saves, edits and restores text presentation through command history', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1-background-'));
  try {
    await copyFile(fixture('task-background.svg'), join(dir, 'background.svg'));
    const output = replay(['read background.svg', 'save out.svg', 'move nodeB 10 5', 'undo',
      'set text1 font-size 20', 'redo', 'show text1', 'undo', 'delete nodeB', 'undo',
      'group pair rect1 text1', 'ungroup pair', 'undo', 'redo', 'save', 'read out.svg'], dir);
    assert.deepEqual(output.match(/error: [^\n]+/gu), ['error: unknown attribute: font-size']);
    assert.ok(output.includes('warning: assigned id rect1 to unnamed <rect>'));
    assert.ok(output.includes('warning: assigned id text1 to unnamed <text>'));
    assert.ok(output.includes('x=318 y=75.4'));
    const codec = new SvgCodec();
    const source = codec.decode(await readFile(fixture('task-background.svg'), 'utf8')).document;
    const restored = codec.decode(await readFile(join(dir, 'out.svg'), 'utf8')).document;
    assert.equal(restored.size, 6);
    assert.deepEqual(restored.find('text1').attributes, {
      id: 'text1', x: '308', y: '70.4', fill: 'white', 'text-anchor': 'middle', 'font-size': '12.8',
    });
    assert.equal(codec.encode(restored), codec.encode(source));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('assignment flowchart A survives composite edits and round-trip with restored geometry', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lab1-flowchart-'));
  try {
    const output = replay(['init 800 600', 'create g flowchart', 'create g node1 in flowchart',
      'create rect start 120 100 160 60 #4a90d9 in node1', 'create text start-label 155 135 "开始" in node1',
      'create g node2 in flowchart', 'create rect process 520 100 160 60 #f5a623 in node2',
      'create text process-label 545 135 "处理数据" in node2', 'create line arrow1 280 130 520 130 black in flowchart',
      'tree', 'move node2 0 100', 'undo', 'set process-label text "处理数据 v2"', 'save flowchart.svg',
      'read flowchart.svg', 'show process', 'show process-label'], dir);
    assert.equal(output.includes('error:'), false);
    assert.ok(output.includes('line#arrow1 (280,130) -> (520,130) stroke=black'));
    assert.ok(output.includes('g#node2 moved back by (0,-100)'));
    assert.ok(output.includes('x=520 y=100 width=160 height=60'));
    const document = new SvgCodec().decode(await readFile(join(dir, 'flowchart.svg'), 'utf8')).document;
    assert.equal(document.size, 8);
    assert.equal(document.find('process-label').text, '处理数据 v2');
    assert.equal(document.find('process-label').parent?.id, 'node2');
    assert.equal(document.find('process').attributes.y, '100');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('assignment minimal SVG imports with all four elements and unchanged hierarchy', async () => {
  const document = new SvgCodec().decode(await readFile(fixture('task-minimal.svg'), 'utf8')).document;
  assert.equal(document.size, 4);
  assert.equal(document.find('flow').children.length, 3);
  assert.equal(document.find('edge').attributes.stroke, 'black');
});
