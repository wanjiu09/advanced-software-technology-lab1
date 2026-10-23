import type { Command } from '../../src/application/commands/Command.js';

export class ControlledCommand implements Command {
  private readonly failures = new Set<string>();
  private readonly events: string[] = [];
  public constructor(private readonly name: string) {}
  public get summary(): string { return this.name; }
  public get trace(): readonly string[] { return [...this.events]; }
  public failNext(operation: 'execute' | 'undo' | 'redo'): void { this.failures.add(operation); }
  public execute(): void { this.act('execute'); }
  public undo(): void { this.act('undo'); }
  public redo(): void { this.act('redo'); }
  private act(operation: string): void {
    if (this.failures.delete(operation)) throw new Error(`failed ${operation}`);
    this.events.push(operation);
  }
}
