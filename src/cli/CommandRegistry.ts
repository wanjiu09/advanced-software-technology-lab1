import type { CliCommand } from './CliCommand.js';

export class CommandRegistry {
  private readonly commands = new Map<string, CliCommand>();

  public register(command: CliCommand): void {
    if (this.commands.has(command.name)) {
      throw new Error(`command already registered: ${command.name}`);
    }
    this.commands.set(command.name, command);
  }

  public async execute(name: string, args: readonly string[]): Promise<readonly string[]> {
    // The only command-name dispatch point. Revisit registration for future extensions.
    const command = this.commands.get(name);
    if (command === undefined) {
      throw new Error(`unknown command: ${name}`);
    }
    return command.execute(args);
  }

  public helpLines(): readonly string[] {
    return [...this.commands.values()].flatMap((command) => command.helpLines());
  }
}
