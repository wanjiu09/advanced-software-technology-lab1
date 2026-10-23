import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class SetCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('set', ['set <id> <attr> <value>'], '修改白名单内的属性或文本内容。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 3) throw new Error('usage: set <id> <attr> <value>');
    return [this.session.set(args[0]!, args[1]!, args[2]!)];
  }
}
