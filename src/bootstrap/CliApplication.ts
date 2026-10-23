import { BackCliCommand } from '../cli/BackCliCommand.js';
import { FrontCliCommand } from '../cli/FrontCliCommand.js';
import { AddToCliCommand } from '../cli/AddToCliCommand.js';
import { UngroupCliCommand } from '../cli/UngroupCliCommand.js';
import { GroupCliCommand } from '../cli/GroupCliCommand.js';
import { RedoCliCommand } from '../cli/RedoCliCommand.js';
import { UndoCliCommand } from '../cli/UndoCliCommand.js';
import { DeleteCliCommand } from '../cli/DeleteCliCommand.js';
import { SetCliCommand } from '../cli/SetCliCommand.js';
import { ScaleCliCommand } from '../cli/ScaleCliCommand.js';
import { MoveCliCommand } from '../cli/MoveCliCommand.js';
import { ShowCliCommand } from '../cli/ShowCliCommand.js';
import { TreeCliCommand } from '../cli/TreeCliCommand.js';
import { CreateCliCommand } from '../cli/CreateCliCommand.js';
import { CanvasCliCommand } from '../cli/CanvasCliCommand.js';
import { InitCliCommand } from '../cli/InitCliCommand.js';
import { EditorSession } from '../application/EditorSession.js';
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
    const session = new EditorSession();
    registry.register(new InitCliCommand(session));
    registry.register(new CanvasCliCommand(session));
    registry.register(new CreateCliCommand(session));
    registry.register(new TreeCliCommand(session));
    registry.register(new ShowCliCommand(session));
    registry.register(new MoveCliCommand(session));
    registry.register(new ScaleCliCommand(session));
    registry.register(new SetCliCommand(session));
    registry.register(new DeleteCliCommand(session));
    registry.register(new UndoCliCommand(session));
    registry.register(new RedoCliCommand(session));
    registry.register(new GroupCliCommand(session));
    registry.register(new UngroupCliCommand(session));
    registry.register(new AddToCliCommand(session));
    registry.register(new FrontCliCommand(session));
    registry.register(new BackCliCommand(session));
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
    registry.register(new PendingCommand('read', ['read <file.svg>'], '读入 SVG，缺失 id 时补全并警告。'));
    registry.register(new PendingCommand('save', ['save [file.svg]'], '保存 SVG；省略路径时使用当前文件路径。'));
  }
}
