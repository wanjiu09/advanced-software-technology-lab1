import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class FrontCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('front', ['front <id>'], '移到同级最前景。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 1) throw new Error('usage: front <id>');
    return [this.session.front(args[0]!)];
  }
}
