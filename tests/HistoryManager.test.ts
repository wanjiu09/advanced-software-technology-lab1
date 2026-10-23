import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HistoryManager } from '../src/application/HistoryManager.js';
import { ControlledCommand } from './support/ControlledCommand.js';

test('history runs commands and moves both stacks in LIFO order', () => {
  const history = new HistoryManager();
  const a = new ControlledCommand('a'); const b = new ControlledCommand('b');
  assert.throws(() => history.undo(), { message: 'nothing to undo' });
  assert.throws(() => history.redo(), { message: 'nothing to redo' });
  history.execute(a); history.execute(b);
  assert.equal(history.undo(), 'undone: b');
  assert.equal(history.undo(), 'undone: a');
  assert.throws(() => history.undo(), { message: 'nothing to undo' });
  assert.equal(history.redo(), 'redone: a');
  assert.equal(history.redo(), 'redone: b');
  assert.deepEqual(a.trace, ['execute', 'undo', 'redo']);
  assert.deepEqual(b.trace, ['execute', 'undo', 'redo']);
});

test('failed execute preserves the redo branch; successful execute clears it', () => {
  const history = new HistoryManager();
  const a = new ControlledCommand('a'); const b = new ControlledCommand('b');
  history.execute(a); history.undo();
  b.failNext('execute');
  assert.throws(() => history.execute(b), { message: 'failed execute' });
  assert.equal(history.redo(), 'redone: a');
  history.undo(); history.execute(b);
  assert.throws(() => history.redo(), { message: 'nothing to redo' });
  assert.equal(history.undo(), 'undone: b');
});

test('failed undo leaves the command on the undo stack for retry', () => {
  const history = new HistoryManager(); const command = new ControlledCommand('a');
  history.execute(command); command.failNext('undo');
  assert.throws(() => history.undo(), { message: 'failed undo' });
  assert.throws(() => history.redo(), { message: 'nothing to redo' });
  assert.equal(history.undo(), 'undone: a');
  assert.equal(history.redo(), 'redone: a');
});

test('failed redo leaves the command on the redo stack for retry', () => {
  const history = new HistoryManager(); const command = new ControlledCommand('a');
  history.execute(command); history.undo(); command.failNext('redo');
  assert.throws(() => history.redo(), { message: 'failed redo' });
  assert.throws(() => history.undo(), { message: 'nothing to undo' });
  assert.equal(history.redo(), 'redone: a');
});

test('IO barrier clears both stacks, survives failed edits, and ends on a successful edit', () => {
  const history = new HistoryManager();
  history.execute(new ControlledCommand('a')); history.execute(new ControlledCommand('b')); history.undo();
  history.barrier();
  const command = new ControlledCommand('new'); command.failNext('execute');
  assert.throws(() => history.execute(command));
  for (const action of [() => history.undo(), () => history.redo()]) {
    assert.throws(action, { message: 'undo not allowed after io command' });
  }
  history.execute(command); history.undo();
  assert.throws(() => history.undo(), { message: 'nothing to undo' });
  assert.equal(history.redo(), 'redone: new');
});
