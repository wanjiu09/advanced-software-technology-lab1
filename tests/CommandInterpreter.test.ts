import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CommandInterpreter } from '../src/cli/CommandInterpreter.js';
import { CommandRegistry } from '../src/cli/CommandRegistry.js';
import { CommandTokenizer } from '../src/cli/CommandTokenizer.js';
import { HelpCommand } from '../src/cli/HelpCommand.js';
import { RecordingCommand } from './support/RecordingCommand.js';

test('dispatches parsed tokens to the registered command without changing the arguments', async () => {
  const registry = new CommandRegistry();
  const command = new RecordingCommand();
  registry.register(command);
  const interpreter = new CommandInterpreter(new CommandTokenizer(), registry);
  assert.deepEqual(await interpreter.execute('record "处理 数据" #3366ff'), ['recorded']);
  assert.deepEqual(command.argumentsReceived, [['处理 数据', '#3366ff']]);
});

test('blank lines and comments invoke no handler; malformed input does not partially dispatch', async () => {
  const registry = new CommandRegistry();
  const command = new RecordingCommand();
  registry.register(command);
  const interpreter = new CommandInterpreter(new CommandTokenizer(), registry);
  assert.deepEqual(await interpreter.execute(''), []);
  assert.deepEqual(await interpreter.execute(' # comment'), []);
  assert.deepEqual(await interpreter.execute('record "unfinished'),
    ['error: unterminated double quote']);
  assert.deepEqual(command.argumentsReceived, []);
});

test('command lookup is case sensitive and unknown commands do not prevent later execution', async () => {
  const registry = new CommandRegistry();
  registry.register(new RecordingCommand());
  const interpreter = new CommandInterpreter(new CommandTokenizer(), registry);
  assert.deepEqual(await interpreter.execute('Record'), ['error: unknown command: Record']);
  assert.deepEqual(await interpreter.execute('record'), ['recorded']);
});

test('reports synchronous and asynchronous failures as one error line', async () => {
  const registry = new CommandRegistry();
  registry.register(new RecordingCommand('sync', () => { throw new Error('first\nsecond\r\nthird'); }));
  registry.register(new RecordingCommand('async', async () => { throw new Error('later'); }));
  registry.register(new RecordingCommand('nonerror', () => { throw 'unexpected value'; }));
  const interpreter = new CommandInterpreter(new CommandTokenizer(), registry);
  assert.deepEqual(await interpreter.execute('sync'), ['error: first second third']);
  assert.deepEqual(await interpreter.execute('async'), ['error: later']);
  assert.deepEqual(await interpreter.execute('nonerror'), ['error: command failed']);
});

test('duplicate registration fails without replacing the original handler', async () => {
  const registry = new CommandRegistry();
  registry.register(new RecordingCommand());
  assert.throws(() => registry.register(new RecordingCommand()),
    { message: 'command already registered: record' });
  assert.deepEqual(await registry.execute('record', []), ['recorded']);
});

test('help is available without a document, reflects the registry and validates its argument count', async () => {
  const registry = new CommandRegistry();
  registry.register(new HelpCommand(registry));
  registry.register(new RecordingCommand('later'));
  const interpreter = new CommandInterpreter(new CommandTokenizer(), registry);
  const lines = await interpreter.execute('help');
  assert.ok(lines.includes('  help'));
  assert.ok(lines.includes('  later [args…]'));
  assert.deepEqual(await interpreter.execute('help extra'), ['error: usage: help']);
});
