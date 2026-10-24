# Lab1：SVG 命令行编辑器

使用 TypeScript 实现，支持六类 SVG 图形、组合编辑、撤销重做和 SVG 文件读写。

[开发报告](doc/README.md)包含架构方案、过程记录、一致性自查和质量保证手段。

## 运行

需要 Node.js ≥ 20.20.0 和 npm。

```bash
npm ci
npm run cli
```

进入编辑器后输入 `help` 查看命令，使用 Ctrl+D 退出。带空格的参数使用双引号包裹，以 `#` 开头的整行表示注释。

## 检查

```bash
npm run typecheck
npm run build
npm test
```

测试使用 Node.js 内置测试运行器，作业验收样本位于 `tests/fixtures/`。
