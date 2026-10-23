import type { Command } from './commands/Command.js';

/** Only successful commands move stacks; failed edits never discard a redo branch. */
export class HistoryManager {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private blocked = false;

  public execute(command: Command): string {
    command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.blocked = false;
    return command.summary;
  }

  public undo(): string {
    this.requireAllowed();
    const command = this.undoStack.at(-1);
    if (command === undefined) throw new Error('nothing to undo');
    command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
    return `undone: ${command.summary}`;
  }

  public redo(): string {
    this.requireAllowed();
    const command = this.redoStack.at(-1);
    if (command === undefined) throw new Error('nothing to redo');
    command.redo();
    this.redoStack.pop();
    this.undoStack.push(command);
    return `redone: ${command.summary}`;
  }

  public barrier(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blocked = true;
  }

  private requireAllowed(): void {
    if (this.blocked) throw new Error('undo not allowed after io command');
  }
}
