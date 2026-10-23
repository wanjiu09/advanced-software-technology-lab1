import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class AddToCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('addto', ['addto <gid> <id>'], '将已有图形移入容器末尾。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 2) throw new Error('usage: addto <gid> <id>');
    return [this.session.addto(args[0]!, args[1]!)];
  }
}
