import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class UndoCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('undo', ['undo'], '撤销上一次编辑；文档操作之后禁止。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 0) throw new Error('usage: undo');
    return [this.session.undo()];
  }
}
