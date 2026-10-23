import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class CreateCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) {
    super('create', [
      'create <type> <id> [params…] [in <containerId>]',
      'create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]',
      'create circle <id> <cx> <cy> <r> [fill] [in <containerId>]',
      'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]',
      'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]',
      'create text <id> <x> <y> "content" [in <containerId>]',
      'create g <id> [in <containerId>]',
    ], '创建六种内置图形之一，id 必填且大小写敏感。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    const [type, id, ...parameters] = args;
    if (type === undefined || id === undefined) throw new Error('usage: create <type> <id> [params…] [in <containerId>]');
    let container: string | undefined;
    if (parameters.length >= 2 && parameters.at(-2) === 'in') {
      container = parameters.pop();
      parameters.pop();
    }
    return [this.session.create(type, id, parameters, container)];
  }
}
