import { CommandInterpreter } from '../cli/CommandInterpreter.js';
import { CommandRegistry } from '../cli/CommandRegistry.js';
import { CommandTokenizer } from '../cli/CommandTokenizer.js';
import { HelpCommand } from '../cli/HelpCommand.js';
import { PendingCommand } from '../cli/PendingCommand.js';
import { Repl } from '../cli/Repl.js';

/** Composition root: CLI wiring and command definitions, without editing rules. */
export class CliApplication {
  public createRepl(
    input: NodeJS.ReadableStream,
    output: NodeJS.WritableStream,
    terminal: boolean = false,
  ): Repl {
    const registry = new CommandRegistry();
    this.registerPendingCommands(registry);
    registry.register(new HelpCommand(registry));
    return new Repl(
      new CommandInterpreter(new CommandTokenizer(), registry),
      input,
      output,
      terminal,
    );
  }

  private registerPendingCommands(registry: CommandRegistry): void {
    registry.register(new PendingCommand('init', ['init [w] [h]'], '新建画布，默认 800×600。'));
    registry.register(new PendingCommand('read', ['read <file.svg>'], '读入 SVG，缺失 id 时补全并警告。'));
    registry.register(new PendingCommand('save', ['save [file.svg]'], '保存 SVG；省略路径时使用当前文件路径。'));
    registry.register(new PendingCommand('canvas', ['canvas [w] [h]'], '查询或修改画布尺寸。'));
    registry.register(new PendingCommand('create', [
      'create <type> <id> [params…] [in <containerId>]',
      'create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]',
      'create circle <id> <cx> <cy> <r> [fill] [in <containerId>]',
      'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]',
      'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]',
      'create text <id> <x> <y> "content" [in <containerId>]',
      'create g <id> [in <containerId>]',
    ], '创建六种内置图形之一，id 必填且大小写敏感。'));
    registry.register(new PendingCommand('delete', ['delete <id>'], '删除图形及其全部子孙。'));
    registry.register(new PendingCommand('move', ['move <id> <dx> <dy>'], '增量平移图形或整组。'));
    registry.register(new PendingCommand('scale', ['scale <id> <factor>'], '等比缩放位置和尺寸，factor 必须为正。'));
    registry.register(new PendingCommand('set', ['set <id> <attr> <value>'], '修改白名单中的属性或 text 内容。'));
    registry.register(new PendingCommand('group', ['group <newGid> <id1> <id2>…'], '将已有图形收入新容器，保持相对顺序。'));
    registry.register(new PendingCommand('ungroup', ['ungroup <gid>'], '解散非根级容器，子节点提升到原位置。'));
    registry.register(new PendingCommand('addto', ['addto <gid> <id>'], '将已有图形移入容器末尾。'));
    registry.register(new PendingCommand('front', ['front <id>'], '移到同级最前景。'));
    registry.register(new PendingCommand('back', ['back <id>'], '移到同级最后景。'));
    registry.register(new PendingCommand('tree', ['tree [id]'], '显示全文档或指定图形的结构树和关键属性。'));
    registry.register(new PendingCommand('show', ['show <id>'], '显示属性明细和父容器。'));
    registry.register(new PendingCommand('undo', ['undo'], '撤销上一次编辑；文档操作之后禁止。'));
    registry.register(new PendingCommand('redo', ['redo'], '重做已撤销的编辑；新编辑清空重做历史。'));
  }
}
