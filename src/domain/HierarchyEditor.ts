import type { Shape } from './Shape.js';
import type { SvgDocument } from './SvgDocument.js';
import type { TreeNode } from './TreeNode.js';

/** Structural rules stay in domain; callers use Command for transactional history. */
export class HierarchyEditor {
  public constructor(private readonly document: SvgDocument) {}

  public group(group: Shape, ids: readonly string[]): void {
    if (ids.length < 2) throw new Error('group requires at least two shapes');
    if (!group.isContainer) throw new Error(`not a container: ${group.id}`);
    if (group.parent !== null || group.children.length !== 0) throw new Error('new group must be empty and detached');
    if ([...this.document.descendants()].some((node) => node.id === group.id)) {
      throw new Error(`id already exists: ${group.id}`);
    }
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) throw new Error(`duplicate shape id: ${id}`);
      seen.add(id);
      this.document.find(id);
    }
    const ordered = [...this.document.descendants()].filter((shape) => seen.has(shape.id));
    const selected = new Set<TreeNode>(ordered);
    for (const shape of ordered) {
      for (let parent = shape.parent; parent !== null; parent = parent.parent) {
        if (selected.has(parent)) {
          throw new Error(`cannot group a container into its own descendant: ${parent.id}`);
        }
      }
    }
    const first = ordered[0]!;
    let common = this.parentOf(first);
    while (!ordered.every((shape) => this.isAncestor(common, shape))) {
      const parent = common.parent;
      if (parent === null) throw new Error('no common container');
      common = parent;
    }
    let branch: TreeNode = first;
    while (branch.parent !== common) branch = this.parentOf(branch);
    const index = common.children.findIndex((child) => child === branch);
    for (const shape of ordered) {
      this.parentOf(shape).removeChild(shape);
      group.appendChild(shape);
    }
    common.insertChild(group, index);
  }

  public ungroup(id: string): void {
    const group = this.document.findContainer(id);
    const parent = this.parentOf(group);
    if (parent === this.document) throw new Error(`cannot ungroup top-level container: ${id}`);
    let index = parent.children.indexOf(group);
    const children = group.children;
    parent.removeChild(group);
    for (const child of children) {
      group.removeChild(child);
      parent.insertChild(child, index);
      index += 1;
    }
  }

  public addto(containerId: string, id: string): void {
    const target = this.document.findContainer(containerId);
    const shape = this.document.find(id);
    if (target === shape || this.isAncestor(shape, target)) {
      throw new Error(`cannot add a shape into its own descendant: ${id}`);
    }
    this.parentOf(shape).removeChild(shape);
    target.appendChild(shape);
  }

  public front(id: string): void { this.reorder(id, true); }
  public back(id: string): void { this.reorder(id, false); }

  private reorder(id: string, front: boolean): void {
    const shape = this.document.find(id);
    const parent = this.parentOf(shape);
    parent.removeChild(shape);
    parent.insertChild(shape, front ? parent.children.length : 0);
  }

  private parentOf(node: TreeNode): TreeNode {
    if (node.parent === null) throw new Error(`shape has no parent: ${node.id}`);
    return node.parent;
  }

  private isAncestor(ancestor: TreeNode, node: TreeNode): boolean {
    for (let parent = node.parent; parent !== null; parent = parent.parent) {
      if (parent === ancestor) return true;
    }
    return false;
  }
}
