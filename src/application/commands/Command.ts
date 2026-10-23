export interface Command {
  readonly summary: string;
  execute(): void;
  undo(): void;
  redo(): void;
}
