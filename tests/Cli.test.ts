import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const entry = fileURLToPath(new URL('../src/bootstrap/main.js', import.meta.url));

test('CLI starts with the required greeting and prompt and exits cleanly at EOF', () => {
  const result = spawnSync(process.execPath, [entry], { input: '', encoding: 'utf8', timeout: 5000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /^svg-editor 0\.1 — type 'help' for commands\nsvg> /);
});

test('help includes all assignment commands and creation signatures, without advertising box', () => {
  const result = spawnSync(process.execPath, [entry], { input: 'help\n', encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  for (const command of [
    'init', 'read', 'save', 'canvas', 'create', 'delete', 'move', 'scale', 'set',
    'group', 'ungroup', 'addto', 'front', 'back', 'tree', 'show', 'help', 'undo', 'redo',
  ]) {
    assert.match(result.stdout, new RegExp(`^  ${command}(?: |$)`, 'm'));
  }
  for (const shape of ['rect', 'circle', 'ellipse', 'line', 'text', 'g']) {
    assert.ok(result.stdout.includes(`create ${shape} <id>`));
  }
  assert.ok(result.stdout.includes('[in <containerId>]'));
  assert.equal(result.stdout.includes('create box'), false);
});

test('multiple failed commands are followed by a successful help, including a final line without newline', () => {
  const result = spawnSync(process.execPath, [entry], {
    input: 'create text title 20 40 "unfinished\nwarp\nhelp extra\nmove r1 1 1\nhelp',
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /error: unterminated double quote/);
  assert.match(result.stdout, /error: unknown command: warp/);
  assert.match(result.stdout, /error: usage: help/);
  assert.match(result.stdout, /error: no document\. use 'init' or 'read' first/);
  assert.equal(result.stdout.match(/error:/g)?.length, 4);
  assert.match(result.stdout, /Commands \(available: init, read, save, canvas, create, move, scale, set, delete, group, ungroup, addto, front, back, undo, redo, tree, show, help\):/);
  assert.equal(result.stdout.includes('created'), false);
});

test('blank lines and commented scripts work with CRLF line endings', () => {
  const result = spawnSync(process.execPath, [entry], {
    input: '\r\n# 示例脚本\r\n  # comment\r\nhelp\r\n',
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout.includes('error:'), false);
  assert.match(result.stdout, /  help/);
});
