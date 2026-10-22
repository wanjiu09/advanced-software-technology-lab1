import { createInterface } from 'node:readline';
import type { CommandInterpreter } from './CommandInterpreter.js';

export class Repl {
  public constructor(
    private readonly interpreter: CommandInterpreter,
    private readonly input: NodeJS.ReadableStream,
    private readonly output: NodeJS.WritableStream,
    private readonly terminal: boolean = false,
  ) {}

  public async run(): Promise<void> {
    this.output.write("svg-editor 0.1 — type 'help' for commands\n");
    const reader = createInterface({
      input: this.input,
      output: this.output,
      terminal: this.terminal,
      crlfDelay: Infinity,
    });
    reader.setPrompt('svg> ');
    reader.on('SIGINT', () => reader.close());
    reader.prompt();

    try {
      for await (const line of reader) {
        const messages = await this.interpreter.execute(line);
        for (const message of messages) {
          this.output.write(`${message}\n`);
        }
        reader.prompt();
      }
    } finally {
      reader.close();
      this.output.write('\n');
    }
  }
}
