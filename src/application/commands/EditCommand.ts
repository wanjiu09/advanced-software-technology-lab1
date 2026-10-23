import type { DocumentMemento } from '../../domain/DocumentMemento.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditorSession } from '../EditorSession.js';
import type { Command } from './Command.js';

/** Transactional Command base: snapshots are owned by the command, not the CLI. */
export abstract class EditCommand implements Command {
  protected result = '';
  protected reversedResult = '';

  public get summary(): string {
    return this.result;
  }

  public get undoSummary(): string { return this.reversedResult; }
  public get redoSummary(): string { return this.result; }

  private before: DocumentMemento | undefined;
  private after: DocumentMemento | undefined;
  private document: SvgDocument | undefined;
  private undone = false;

  public constructor(protected readonly session: EditorSession) {}

  public execute(): void {
    if (this.before !== undefined) throw new Error('command already executed');
    const document = this.session.requireDocument();
    const before = document.createMemento();
    try {
      this.apply(document);
      const after = document.createMemento();
      this.document = document;
      this.before = before;
      this.after = after;
    } catch (error: unknown) {
      document.restore(before);
      throw error;
    }
  }

  public undo(): void {
    if (this.before === undefined || this.undone) throw new Error('command cannot be undone');
    this.currentDocument().restore(this.before);
    this.undone = true;
  }

  public redo(): void {
    if (this.after === undefined || !this.undone) throw new Error('command cannot be redone');
    this.currentDocument().restore(this.after);
    this.undone = false;
  }

  private currentDocument(): SvgDocument {
    const document = this.session.requireDocument();
    if (document !== this.document) throw new Error('command belongs to another document');
    return document;
  }

  protected abstract apply(document: SvgDocument): void;
}
