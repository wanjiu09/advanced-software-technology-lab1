import type { SvgDocument } from './SvgDocument.js';

/** Never exposes the saved tree; each restoration receives a fresh deep copy. */
export class DocumentMemento {
  private readonly snapshot: SvgDocument;

  public constructor(document: SvgDocument) {
    this.snapshot = document.copy();
  }

  public materialize(): SvgDocument {
    return this.snapshot.copy();
  }
}
