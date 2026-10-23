export interface Command {
  readonly summary: string;
  readonly undoSummary: string;
  readonly redoSummary: string;
  execute(): void;
  undo(): void;
  redo(): void;
}
