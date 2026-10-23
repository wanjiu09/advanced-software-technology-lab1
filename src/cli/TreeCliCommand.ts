import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';
import { ShapePresenter } from './ShapePresenter.js';

export class TreeCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession, private readonly presenter = new ShapePresenter()) {
    super('tree', ['tree [id]'], '显示全文档或指定图形的结构树和关键属性。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    if (args.length > 1) throw new Error('usage: tree [id]');
    return this.presenter.tree(this.session.tree(args[0]));
  }
}
