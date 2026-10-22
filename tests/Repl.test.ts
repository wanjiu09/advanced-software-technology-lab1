import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { CommandInterpreter } from '../src/cli/CommandInterpreter.js';
import { CommandRegistry } from '../src/cli/CommandRegistry.js';
import { CommandTokenizer } from '../src/cli/CommandTokenizer.js';
import { Repl } from '../src/cli/Repl.js';
import { RecordingCommand } from './support/RecordingCommand.js';

test('runs buffered input in order even when handlers are asynchronous and stdin reaches EOF', async () => {
  const registry = new CommandRegistry();
  registry.register(new RecordingCommand('record', async (args) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return [`received: ${args.join('|')}`];
  }));
  const input = Readable.from(['record "开始 处理"\nrecord #ffffff\nrecord end']);
  let transcript = '';
  const output = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      transcript += chunk.toString();
      callback();
    },
  });
  await new Repl(new CommandInterpreter(new CommandTokenizer(), registry), input, output).run();
  assert.match(transcript, /svg-editor 0\.1/);
  assert.match(transcript, /svg> /);
  assert.match(transcript, /received: 开始 处理[\s\S]*received: #ffffff[\s\S]*received: end/);
  assert.equal(transcript.includes('error:'), false);
});
