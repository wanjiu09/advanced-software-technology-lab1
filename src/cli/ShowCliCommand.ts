import type { EditorSession } from '../application/EditorSession.js';
import { CliCommand } from './CliCommand.js';
import { ShapePresenter } from './ShapePresenter.js';

export class ShowCliCommand extends CliCommand {
  public constructor(private readonly session: EditorSession, private readonly presenter = new ShapePresenter()) {
    super('show', ['show <id>'], '显示属性明细和父容器。');
  }
  public override execute(args: readonly string[]): readonly string[] {
    const [id] = args;
    if (id === undefined || args.length !== 1) throw new Error('usage: show <id>');
    return this.presenter.show(this.session.show(id));
  }
}
