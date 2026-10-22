import type { CommandRegistry } from './CommandRegistry.js';
import type { CommandTokenizer } from './CommandTokenizer.js';

export class CommandInterpreter {
  public constructor(
    private readonly tokenizer: CommandTokenizer,
    private readonly registry: CommandRegistry,
  ) {}

  public async execute(line: string): Promise<readonly string[]> {
    try {
      const [name, ...args] = this.tokenizer.tokenize(line);
      if (name === undefined) {
        return [];
      }
      return await this.registry.execute(name, args);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'command failed';
      return [`error: ${message.replace(/[\r\n\u2028\u2029]+/gu, ' ')}`];
    }
  }
}
