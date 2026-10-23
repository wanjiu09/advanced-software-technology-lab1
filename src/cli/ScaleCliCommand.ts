import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class ScaleCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('scale', ['scale <id> <factor>'], '等比缩放位置和尺寸，factor 必须为正。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 2) throw new Error('usage: scale <id> <factor>');
    return [this.session.scale(args[0]!, args[1]!)];
  }
}
