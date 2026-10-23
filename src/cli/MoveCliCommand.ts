import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class MoveCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('move', ['move <id> <dx> <dy>'], '增量平移图形或整组。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 3) throw new Error('usage: move <id> <dx> <dy>');
    return [this.session.move(args[0]!, args[1]!, args[2]!)];
  }
}
