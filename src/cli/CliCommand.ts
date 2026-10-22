/** CLI handler contract. Reversible editing commands will live in application. */
export abstract class CliCommand {
  public constructor(
    private readonly commandName: string,
    private readonly syntax: readonly string[],
    private readonly description: string,
  ) {}

  public get name(): string {
    return this.commandName;
  }

  public helpLines(): readonly string[] {
    return [...this.syntax.map((line) => `  ${line}`), `    ${this.description}`];
  }

  public abstract execute(
    args: readonly string[],
  ): readonly string[] | Promise<readonly string[]>;
}
