import { CliCommand } from '../../src/cli/CliCommand.js';

export class RecordingCommand extends CliCommand {
  private readonly calls: (readonly string[])[] = [];

  public constructor(
    name: string = 'record',
    private readonly action: (
      args: readonly string[],
    ) => readonly string[] | Promise<readonly string[]> = () => ['recorded'],
  ) {
    super(name, [`${name} [args…]`], 'Test command');
  }

  public get argumentsReceived(): readonly (readonly string[])[] {
    return this.calls.map((args) => [...args]);
  }

  public override execute(args: readonly string[]): readonly string[] | Promise<readonly string[]> {
    this.calls.push([...args]);
    return this.action(args);
  }
}
