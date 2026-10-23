import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class DeleteCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('delete', ['delete <id>'], '删除图形及其全部子孙。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 1) throw new Error('usage: delete <id>');
    return [this.session.delete(args[0]!)];
  }
}
