import type { SvgDocument } from '../../domain/SvgDocument.js';

export interface SvgReadResult {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
  readonly path: string;
}

export interface SvgStorage {
  read(path: string): Promise<SvgReadResult>;
  write(path: string, document: SvgDocument): Promise<string>;
}
