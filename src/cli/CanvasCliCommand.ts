import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class CanvasCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('canvas', ['canvas [w] [h]'], '查询或修改画布尺寸。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 0 && args.length !== 2) throw new Error('usage: canvas [w] [h]');
    const size = this.session.canvas(args[0], args[1]);
    return [`canvas ${size.width}x${size.height}${args.length === 0 ? '' : ' resized'}`];
  }
}
