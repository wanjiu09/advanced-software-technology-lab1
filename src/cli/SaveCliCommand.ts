import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class SaveCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) { super('save', ['save [file.svg]'], '保存 SVG；省略路径时使用当前文件路径。'); }
  public override async execute(args: readonly string[]): Promise<readonly string[]> {
    if (args.length > 1) throw new Error('usage: save [file.svg]');
    return this.session.save(args[0]);
  }
}
