import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';

export class ReadCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession) { super('read', ['read <file.svg>'], '读入 SVG，缺失 id 时补全并警告。'); }
  public override async execute(args: readonly string[]): Promise<readonly string[]> {
    if (args.length !== 1) throw new Error('usage: read <file.svg>');
    return this.session.read(args[0]!);
  }
}
