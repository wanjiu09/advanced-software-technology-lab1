import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class BackCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('back', ['back <id>'], '移到同级最后景。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 1) throw new Error('usage: back <id>');
    return [this.session.back(args[0]!)];
  }
}
