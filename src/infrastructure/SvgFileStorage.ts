import { TextDecoder } from 'node:util';
import { access, chmod, lstat, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { SvgStorage, SvgReadResult } from '../application/ports/SvgStorage.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';

export class SvgFileStorage implements SvgStorage {
  public constructor(private readonly codec = new SvgCodec()) {}

  public async read(path: string): Promise<SvgReadResult> {
    let content: string;
    try { content = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path)); }
    catch { throw new Error(`cannot read file: ${path}`); }
    const decoded = this.codec.decode(content);
    return Object.freeze({ ...decoded, path: resolve(path) });
  }

  public async write(path: string, document: SvgDocument): Promise<string> {
    const content = this.codec.encode(document);
    const target = resolve(path);
    let temporary: string | undefined;
    try {
      let mode: number | undefined;
      try {
        const status = await lstat(target);
        if (!status.isFile()) throw new Error('not a regular file');
        await access(target, constants.W_OK);
        mode = status.mode & 0o777;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      temporary = await mkdtemp(join(dirname(target), `.${basename(target)}-`));
      const file = join(temporary, 'document.svg');
      await writeFile(file, content, { encoding: 'utf8', mode: mode ?? 0o666 });
      if (mode !== undefined) await chmod(file, mode);
      await rename(file, target);
      return target;
    } catch { throw new Error(`cannot write file: ${path}`); }
    finally { if (temporary !== undefined) await rm(temporary, { recursive: true, force: true }).catch(() => {}); }
  }
}
