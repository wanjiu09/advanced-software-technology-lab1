import { EditCommand } from '../../src/application/commands/EditCommand.js';
import type { SvgDocument } from '../../src/domain/SvgDocument.js';
import { Rect } from '../../src/domain/Rect.js';

export class FailingEditCommand extends EditCommand {
  protected override apply(document: SvgDocument): void {
    document.resize(1, 2);
    document.find('r').move(100, 200);
    document.add(new Rect('partial'));
    throw new Error('simulated late failure');
  }
}
