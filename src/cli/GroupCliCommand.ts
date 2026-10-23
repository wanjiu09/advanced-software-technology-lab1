import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class GroupCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('group', ['group <newGid> <id1> <id2>…'], '将已有图形收入新容器，保持文档中的相对顺序。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length < 3) throw new Error('usage: group <newGid> <id1> <id2>…');
    return [this.session.group(args[0]!, args.slice(1))];
  }
}
