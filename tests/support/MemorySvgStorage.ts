import type { SvgReadResult, SvgStorage } from '../../src/application/ports/SvgStorage.js';
import type { SvgDocument } from '../../src/domain/SvgDocument.js';

export class MemorySvgStorage implements SvgStorage {
  private readonly documents = new Map<string, SvgDocument>();
  private readonly paths: string[] = [];
  private readFailure = false;
  private writeFailure = false;
  private gate: Promise<void> | undefined;
  private release: (() => void) | undefined;
  public get writes(): readonly string[] { return [...this.paths]; }
  public seed(path: string, document: SvgDocument): void { this.documents.set(path, document.copy()); }
  public failNextRead(): void { this.readFailure = true; }
  public failNextWrite(): void { this.writeFailure = true; }
  public pauseNextWrite(): void { this.gate = new Promise((resolve) => { this.release = resolve; }); }
  public resumeWrite(): void { this.release?.(); }
  public async read(path: string): Promise<SvgReadResult> {
    if (this.readFailure) { this.readFailure = false; throw new Error(`cannot read file: ${path}`); }
    const document = this.documents.get(path);
    if (document === undefined) throw new Error(`cannot read file: ${path}`);
    return { document: document.copy(), warnings: [], path };
  }
  public async write(path: string, document: SvgDocument): Promise<string> {
    if (this.writeFailure) { this.writeFailure = false; throw new Error(`cannot write file: ${path}`); }
    const gate = this.gate; this.gate = undefined;
    if (gate !== undefined) await gate;
    this.documents.set(path, document.copy()); this.paths.push(path);
    return path;
  }
}
