import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class UngroupCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('ungroup', ['ungroup <gid>'], '解散非根级容器，子图形提升到原位置。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 1) throw new Error('usage: ungroup <gid>');
    return [this.session.ungroup(args[0]!)];
  }
}
