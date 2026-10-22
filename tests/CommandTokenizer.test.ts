import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CommandTokenizer } from '../src/cli/CommandTokenizer.js';

const tokenizer = new CommandTokenizer();

test('blank lines and whole-line comments produce no command', () => {
  for (const line of ['', ' \t ', '# replay a diagram', '  # 创建流程图']) {
    assert.deepEqual(tokenizer.tokenize(line), []);
  }
});

test('parses the assignment text command, preserving Chinese, spaces and punctuation', () => {
  assert.deepEqual(tokenizer.tokenize('create text start-label 155 135 "开始 处理数据" in node1'),
    ['create', 'text', 'start-label', '155', '135', '开始 处理数据', 'in', 'node1']);
});

test('preserves color arguments and never treats a trailing # as an inline comment', () => {
  assert.deepEqual(tokenizer.tokenize('create rect bg 0 0 800 600 #ffffff'),
    ['create', 'rect', 'bg', '0', '0', '800', '600', '#ffffff']);
  assert.deepEqual(tokenizer.tokenize('set title text "# My Diagram"'),
    ['set', 'title', 'text', '# My Diagram']);
  assert.deepEqual(tokenizer.tokenize('help # note'), ['help', '#', 'note']);
});

test('keeps an empty quoted text argument', () => {
  assert.deepEqual(tokenizer.tokenize('set title text ""'), ['set', 'title', 'text', '']);
});

test('quoted paths and mixed whitespace retain their intended token boundaries', () => {
  assert.deepEqual(tokenizer.tokenize(' \t read\t"my diagrams/流程图.svg"  '),
    ['read', 'my diagrams/流程图.svg']);
});

test('supports escaped double quotes and backslashes inside quotes', () => {
  assert.deepEqual(tokenizer.tokenize(String.raw`set title text "say \"hello\" \\ end"`),
    ['set', 'title', 'text', 'say "hello" \\ end']);
});

test('preserves unrecognized escapes and unquoted backslashes literally', () => {
  assert.deepEqual(tokenizer.tokenize(String.raw`read "C:\new\diagram.svg"`),
    ['read', String.raw`C:\new\diagram.svg`]);
  assert.deepEqual(tokenizer.tokenize(String.raw`read folder\diagram.svg`),
    ['read', String.raw`folder\diagram.svg`]);
});

test('concatenates adjacent quoted and unquoted segments into a single argument', () => {
  assert.deepEqual(tokenizer.tokenize('read diagrams/"my file".svg'),
    ['read', 'diagrams/my file.svg']);
});

test('rejects unfinished quotes and starts the next command with fresh state', () => {
  assert.throws(() => tokenizer.tokenize('set title text "unfinished'),
    { message: 'unterminated double quote' });
  assert.throws(() => tokenizer.tokenize(String.raw`set title text "unfinished\"`),
    { message: 'unterminated double quote' });
  assert.deepEqual(tokenizer.tokenize('help'), ['help']);
});
