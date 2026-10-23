import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class InitCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('init', ['init [w] [h]'], '新建画布，默认 800×600。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length > 2) throw new Error('usage: init [w] [h]');
    this.session.initialize(args[0], args[1]);
    const size = this.session.canvas();
    return [`canvas ${size.width}x${size.height} created`];
  }
}
