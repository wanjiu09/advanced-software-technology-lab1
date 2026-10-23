import { CliCommand } from './CliCommand.js';

/** Advertises later milestones without pretending their operations succeeded. */
export class PendingCommand extends CliCommand {
  public override execute(_args: readonly string[]): readonly string[] {
    throw new Error(`command not implemented yet: ${this.name}`);
  }
}
