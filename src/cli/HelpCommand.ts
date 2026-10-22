import { CliCommand } from './CliCommand.js';
import type { CommandRegistry } from './CommandRegistry.js';

export class HelpCommand extends CliCommand {
  public constructor(private readonly registry: CommandRegistry) {
    super('help', ['help'], '显示全部命令与语法。');
  }

  public override execute(args: readonly string[]): readonly string[] {
    if (args.length !== 0) {
      throw new Error('usage: help');
    }
    return [
      'Commands (stage 1: only help is available):',
      ...this.registry.helpLines(),
      '双引号包裹带空格参数；以 # 开头的整行是注释；EOF / Ctrl+D 结束会话。',
    ];
  }
}
