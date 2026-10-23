import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class RedoCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('redo', ['redo'], '重做已撤销的编辑；新编辑清空重做历史。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 0) throw new Error('usage: redo');
    return [this.session.redo()];
  }
}
