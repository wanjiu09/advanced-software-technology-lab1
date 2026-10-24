# Lab1：SVG 命令行编辑器开发报告

本项目是我借助 AI 编程助手完成的 TypeScript SVG 命令行编辑器，实现了图形创建与编辑、分组、撤销重做和文件读写。

本文首先介绍模块划分、设计模式、依赖规则与设计取舍，再记录开发中的关键讨论和修改过程，随后对照方案检查实现的一致性，最后说明功能验证与代码质量检查的方法及结果。

项目仓库：[wanjiu09/advanced-software-technology-lab1](https://github.com/wanjiu09/advanced-software-technology-lab1)。

## 一、架构方案

### 1.1 模块划分与职责

设计时，我按输入处理、编辑用例、图形规则和文件存储划分职责，形成五个模块。各模块通过应用用例、查询结果和存储端口协作。

| 模块目录 | 职责 | 主要类或接口 |
| --- | --- | --- |
| `src/domain/` | 图形的几何与样式行为，文档和树结构的合法性，结构编辑及状态快照 | `Shape`、`GeometricShape`、六种具体图形、`Geometry`、`TreeNode`、`SvgDocument`、`HierarchyEditor`、`ShapeFactory`、`DocumentMemento` |
| `src/application/` | 协调编辑用例，保存当前文档和路径，管理 Command、历史及 IO 屏障，提供只读查询结果和存储端口 | `EditorSession`、`HistoryManager`、`ShapeView`、`commands/`、`ports/SvgStorage` |
| `src/cli/` | REPL、分词、参数处理、命令注册，以及 `tree`、`show`、`help` 的显示；把请求交给应用层 | `Repl`、`CommandTokenizer`、`CommandInterpreter`、`CommandRegistry`、各 CLI 命令、`ShapePresenter` |
| `src/infrastructure/` | 真实文件 IO、SVG XML 编解码、导入变换和继承属性的处理 | `SvgFileStorage`、`SvgCodec`、`SvgTransform`、`SvgPresentation` |
| `src/bootstrap/` | 创建对象、注入存储适配器、注册命令并启动程序 | `CliApplication`、`main.ts` |

此外，`tests/` 保存自动测试，`tests/fixtures/` 保存取自作业的 SVG 样本，`doc/` 保存报告与说明。

下面是用 PlantUML 绘制的组件图。实线表示源码依赖，虚线表示存储适配器实现端口。

![五个生产模块及存储端口的依赖关系](https://raw.githubusercontent.com/wanjiu09/advanced-software-technology-lab1/final/doc/images/architecture.svg)

一次几何编辑的主要调用过程是：

```text
Repl → CommandInterpreter → CLI 命令适配器 → EditorSession
     → HistoryManager → 具体编辑 Command → SvgDocument / Shape
```

文件操作通过另一条边界进行：`EditorSession → SvgStorage`。应用层只认识端口，具体的 `SvgFileStorage` 和 `SvgCodec` 由 `CliApplication` 创建并注入。应用层测试通过注入内存存储替身模拟读写成功与失败。

### 1.2 设计模式的选择与代码落地

#### （1）Command：把一次可撤销编辑封装为对象

项目使用 Command 模式，将一次编辑封装为能够执行、撤销和重做的对象，并以命令对象为单位管理历史。

[`Command`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/application/commands/Command.ts) 定义 `execute()`、`undo()`、`redo()` 和对应的反馈信息；[`EditCommand`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/application/commands/EditCommand.ts) 实现共享的快照与回滚流程。`CreateCommand`、`MoveCommand`、`SetCommand`、`DeleteCommand`、`GroupCommand` 等具体命令只实现自己的编辑动作。

[`HistoryManager`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/application/HistoryManager.ts) 通过 Command 协议统一管理编辑历史。它在命令成功后才压入 undo 栈并清空 redo 栈；撤销或重做成功后才移动栈项。`group g1 r1 c1` 对多个节点的修改作为一次编辑进入历史，对应一个撤销单元。

我将文档类操作与可撤销编辑区分开：成功的 `init`、`read`、`save`、`canvas` 尺寸修改会清空历史并设置禁用状态，直到下一次成功编辑；查询和失败操作不改变历史。CLI 中的 `CliCommand` 负责输入适配，应用层的 Command 负责编辑、撤销和重做。

#### （2）Composite：容器和叶子使用统一的操作接口

SVG 本身是一棵树，因此我采用 Composite 表达图形结构。[`Shape`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/domain/Shape.ts) 是抽象组件，`Rect`、`Circle`、`Ellipse`、`Line`、`Text` 是叶子，`Group` 是组合组件。

例如，`MoveCommand` 查找到图形后直接调用 `shape.move(dx, dy)`：叶子修改自己的坐标，`Group` 则通过相同接口递归移动孩子。缩放也通过相同接口递归作用于子图形。

[`TreeNode`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/domain/TreeNode.ts) 封装父子链接与兄弟顺序，并在受控的插入操作中检查唯一 ID、单一父级和无环关系。`SvgDocument` 与 `Shape` 分别继承 `TreeNode`，复用这套树结构管理机制。删除容器通过父节点移除整棵子树实现。

各图形管理自身的几何属性。组的公共样式设置在 `g` 自身，使用 SVG 的继承语义，子节点的显式样式优先。

#### （3）简单工厂：集中维护图形类型与创建规则

[`ShapeFactory`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/domain/ShapeFactory.ts) 通过私有映射和 `ShapeDefinition` 集中管理六类图形的构造与参数规则。CLI 的位置参数和 SVG 的具名属性均通过该入口创建图形。图形复制由各图形的 `copy()` 方法通过多态完成。

两处集中名字分派列为**待重构项**：

- `CommandRegistry`：命令名到 CLI 实现的分派。
- `ShapeFactory`：图形类型名到具体图形类的分派。

#### （4）Memento：保存完整状态，配合 Command 恢复文档

我采用 Memento 保存编辑前后的文档状态。[`SvgDocument`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/domain/SvgDocument.ts) 创建和恢复快照，[`DocumentMemento`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/domain/DocumentMemento.ts) 私有保存文档深拷贝，具体命令保存执行前后的两个快照。

编辑过程为“保存 before → 执行编辑 → 保存 after”；发生异常时恢复 before。undo 恢复 before，redo 恢复 after。快照涵盖几何、样式、文本、父子关系及顺序，每次恢复均生成独立副本，保持历史快照与当前文档之间的隔离。

若文档含 N 个图形、保存 K 条历史，完整快照的历史空间约为 O(KN)。复制和恢复还会调用树结构校验，存在额外遍历开销。

#### （5）端口与适配器：隔离文件 IO

[`SvgStorage`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/application/ports/SvgStorage.ts) 属于应用层，定义它所需的读写能力；[`SvgFileStorage`](https://github.com/wanjiu09/advanced-software-technology-lab1/blob/final/src/infrastructure/SvgFileStorage.ts) 实现端口，负责文件系统操作，XML 细节交给 `SvgCodec`。

读入时先完整构造并校验新文档，成功后才替换会话；保存时先序列化，再写入同目录临时文件并替换目标，成功后才更新默认路径和历史屏障。这样的职责划分也让错误处理可以在应用层和真实文件系统两层分别验证。

### 1.3 依赖方向规则

我采用以下源码依赖规则，将违反规则的导入视为需要处理的问题：

| 模块 | 允许依赖 | 原因与限制 |
| --- | --- | --- |
| domain | 自身 | 几何和树规则不依赖输入端、存储方式或 XML 库，便于独立测试 |
| application | domain、自身及自身端口 | 协调用例，不导入 CLI、文件系统或具体存储适配器 |
| cli | application、自身；终端输入输出所需的 Node 能力 | 不直接操作领域对象，不访问 SVG 文件系统，不另建历史栈；`Repl` 使用 `node:readline` 属于其职责 |
| infrastructure | application 的存储端口、domain、自身，以及 Node/XML 库 | 负责把外部文件映射为领域对象，不依赖 CLI |
| bootstrap | 上述全部模块 | 作为装配入口连接实现与抽象，不承载编辑规则 |

测试代码允许引用被测模块，生产代码不依赖测试。应用层通过不可变的 `ShapeView` 向 CLI 提供查询结果，图形状态与编辑行为封装在领域对象中。

### 1.4 变化点假设与设计取舍

| 变化点 | 设计安排 | 取舍依据 |
| --- | --- | --- |
| 图形类型变化 | 通过 `Shape` 的多态行为和 `ShapeFactory` 集中管理类型与创建规则 | 将类型差异收拢到图形类和工厂，供 CLI 创建与 SVG 导入复用 |
| 编辑命令变化 | 各命令共享 `EditCommand` 与 `HistoryManager`，CLI 适配器独立注册 | 保持一条编辑对应一个历史单元，使历史管理与具体编辑行为分离 |
| 输入方式变化 | 应用用例通过参数和 `ShapeView` 协作，终端解析集中在 CLI | 让输入处理和编辑规则各自维护 |
| XML 库或文件存储方式变化 | 应用层依赖 `SvgStorage`，XML 和磁盘操作集中在 infrastructure | 按 SVG 读写需求定义端口，将具体存储实现与用例协调分开 |
| SVG 导入规则变化 | `SvgCodec`、`SvgTransform`、`SvgPresentation` 分别处理文档映射、变换和继承属性 | 按处理职责组织导入逻辑，便于定位和修改规则 |
| 文档规模和历史长度变化 | Command 协议与快照实现分离，当前使用完整文档快照和树遍历查询 | 完整快照统一恢复复杂编辑状态，树遍历查询保持单一的数据来源；相应代价是复制与存储开销 |

## 二、过程记录

我按确定设计、分步实现、最后验证和修正的顺序推进项目。AI 协助生成实现与测试、定位问题，我负责梳理需求、确定方案和检查结果。

### 2.1 按模块和用例拆分开发步骤

开始时，我与 AI 讨论模块划分和设计模式，并把领域对象、首个可撤销用例、历史管理、结构编辑和文件 IO 分成不同检查点。

实现 Command 时，我分别验证命令的解析分发和编辑的撤销重做。工程基础提交 `dee0448` 建立 CLI 入口与处理协议；`005b815` 引入应用层 `Command`、`EditCommand`、`CreateCommand` 与文档快照；`3c79e47` 接入历史栈。

我先检查单个命令能否独立执行、撤销和重做，再通过 REPL 验证连续编辑与历史管理，使各个检查点对应明确的运行结果。

### 2.2 用完整快照恢复编辑状态

检查撤销设计时，我关注到删除整个组需要恢复子孙、父级、兄弟顺序、文字和样式，跨父级分组也会同时改变多处树结构。因此，撤销记录需要覆盖这些状态。

我与 AI 围绕“怎样完整恢复一次编辑”讨论后，采用了完整文档快照。命令保存目标 ID，在操作时查找对应图形，适应快照恢复后的对象替换。

我把验收点设为编辑前后的整树比较。`ReversibleEdits.test.ts` 检查删除整组后一次撤销恢复原树，还注入“后面的子节点数值溢出”等失败，验证整棵树保持原状态、redo 分支仍可使用。我据此将错误反馈与状态回滚放在同一条验收流程中检查。

### 2.3 确定分组顺序与层叠关系

实现结构编辑时，我注意到 group 参数的输入顺序可能与节点在原文档中的排列顺序不同。例如，命令先选中后出现的图形，再选中先出现的图形，分组时仍需保持原来的绘制顺序。

我将这类问题交给 AI 一起梳理，确定了本项目的具体规则：分组按原文档深度优先顺序排列，跨父级分组放入最近公共容器；解组时，子节点占据原组所在位置。

另外，`front` 对应 SVG 同级列表的末尾，`back` 对应开头；根级组禁止解散，祖先和后代不能被同一条 group 同时选中。`ba65c42` 将这些规则放入 `HierarchyEditor`，并通过逆序参数、跨父级分组、循环引用、层叠顺序与撤销恢复测试确认。

### 2.4 区分 IO 成功与失败时的历史处理

核对文件操作要求时，我确认成功的 `init`、`read`、`save` 和画布尺寸修改会清空历史并禁止 undo/redo；路径不可写或 XML 不合法时，则需要保留当前文档和历史。

我让 AI 把“准备结果”和“发布结果”分开。read 先得到完整、合法的新文档；save 先得到可写入的序列化结果。只有 IO 成功，`EditorSession` 才更新路径并设置历史屏障。真实文件适配器采用临时文件替换，降低失败时覆盖原文件内容的风险。

我用“先编辑、undo 留出 redo、再执行失败 IO、最后 redo”的顺序验证这一点；同时检查失败保存是否改变默认路径、目标文件是否保持原内容。缺 ID 补全也先预留全文件显式 ID，避免前面的无名矩形占用后面已有的 `rect1`。这些检查在 `b9cdbdd` 对应的存储和文件测试中落地。

### 2.5 补齐复杂 SVG 示例的导入处理

回放作业示例时，我发现最小 SVG 和 `other.svg` 可以读入，但背景中的嵌套变换示例会报 `unknown attribute: text-anchor`。初版还会拒绝带文字或描边的缩放变换。

我与 AI 将修正内容分成两部分：导入时保留 `font-size`、`text-anchor`；消除外部 transform 时同步折算文字字号与描边宽度，使图形位置和外观一致。

`aaf76f5` 新增 `SvgPresentation` 处理继承和相对字号，并调整 `SvgTransform`。导入属性与 CLI 的 `set` 白名单分别处理：导入文件保留字号和锚点，`set text1 font-size 20` 则按任务规定返回未知属性。

确认修复时，既运行复杂背景样本的导入、保存、编辑与撤销测试，也比较浏览器中原 SVG 与保存后的图像。四组固定样本的像素差异均为 0。

### 2.6 统一命令输出与任务示例

核对输出时，我发现原来的 `tree` 将文字写成 `x=… y=…`，线段写成四个属性；`show` 将几何属性逐项换行，撤销显示通用的 `undone: …`，与任务示例的格式不同。

我与 AI 沿用已有的查询接口，让领域对象提供只读的控制点和几何属性名，经 `ShapeView` 交给显示器；各编辑 Command 提供自己的撤销、重做反馈。

修正后，文字显示为 `(x,y) "内容"`，线段显示为 `(x1,y1) -> (x2,y2)`，`show` 的几何属性合并为一行；移动与撤销能反馈目标坐标，删除撤销能反馈恢复的父级。`AssignmentAcceptance.test.ts` 将作业第 6 节完整会话转成验收测试，忽略用于排版的对齐空格后比较完整输出。我据此将完整会话回放加入验收流程。

### 2.7 关键提交与实现结果

| 提交 | 本次完成的主要内容 | 对设计选择的验证 |
| --- | --- | --- |
| `21aa2c0` | 初始化独立仓库 | 为分阶段开发建立版本管理基础 |
| `dee0448` | TypeScript 工程、REPL、分词与命令注册 | 输入处理与装配入口分开 |
| `28e138f` | 领域图形、组合树、几何行为与集中工厂 | Composite 和工厂先于 CLI 编辑用例落地 |
| `005b815` | 首个创建用例、可撤销 Command 与文档快照 | 验证单个命令的执行、撤销、重做及失败恢复 |
| `3c79e47` | 几何编辑、历史栈、分支与历史屏障 | 多种编辑复用同一 Command 协议 |
| `ba65c42` | 分组、解组、换父级及前后层次 | 复杂结构编辑复用既有树规则与快照机制 |
| `b9cdbdd` | SVG 文件适配器、读写及 IO 屏障 | 应用端口隔离与失败 IO 测试 |
| `aaf76f5` | 复杂 SVG 示例兼容、输出反馈及作业验收测试 | 根据原文回放和浏览器验证纠正已有实现 |

## 三、一致性自查

### 3.1 实际目录是否与方案一致

我对照当前目录核查，生产代码分为 domain、application、cli、infrastructure、bootstrap 五个模块。`commands/` 和 `ports/` 是 application 内的职责细分。当前共有 62 个生产 TypeScript 文件，其中 58 个类均使用同名独立文件，其余为接口、查询类型和入口文件。

实现过程中确有细化和调整，我将其集中记录如下：

| 调整 | 原因 | 对原方案的影响 |
| --- | --- | --- |
| 用 TreeNode、Geometry、GeometricShape 复用树和数值行为 | 避免根文档、组和不同叶子重复维护相同规则 | 属于 domain 内部细化，保留封装与多态边界 |
| 先以 CreateCommand 验证快照，再接历史管理 | 把单命令正确性与会话历史正确性分开验证 | 细化应用层的实现步骤 |
| 结构编辑规则集中到 HierarchyEditor | 分组、解组和循环检测涉及多节点约束 | CLI 与应用命令不直接管理底层节点数组 |
| infrastructure 增加 SvgTransform、SvgPresentation | 单独处理变换组合、字号和描边继承 | 避免 SvgCodec 同时承担所有导入细节 |
| 增加只读 points、geometryNames 和命令专属反馈 | 对齐作业显示格式，避免增加按 tag 分派 | 查询投影扩展，领域状态仍由受控方法修改 |
| 将原计划的 examples/ 样本归并到 tests/fixtures/ | 样本与端到端测试共同维护 | 验收样本集中管理 |

### 3.2 依赖方向是否违反方案

我按静态 import 关系检查模块方向，并抽样阅读以下调用点：

| 检查对象 | 实际依赖或行为 | 自查结论 |
| --- | --- | --- |
| `domain/Group.ts`、`domain/HierarchyEditor.ts` | 只依赖 domain，不使用终端或文件 API | 符合规则 |
| `application/HistoryManager.ts` | 只依赖 Command 协议，不判断具体编辑或图形类型 | 符合规则 |
| `application/EditorSession.ts` | 依赖领域、应用命令和 SvgStorage，不导入具体文件/XML 适配器 | 符合规则 |
| `cli/ShapePresenter.ts` | 只依赖 ShapeView；CLI 命令把请求交给 EditorSession | 符合规则 |
| `cli/Repl.ts` | 使用 node:readline 处理终端流，不读写 SVG 文件 | 符合规则 |
| `infrastructure/SvgFileStorage.ts`、`SvgCodec.ts` | 实现应用端口并映射领域模型，不依赖 CLI | 符合规则 |
| `bootstrap/CliApplication.ts` | 创建同一 ShapeFactory，注入会话与 SVG 编解码器并注册命令 | 符合装配职责 |

静态 import 检查符合上述依赖规则，生产源码没有 `switch` 语句。我还核对了图形行为的多态调用、树结构与样式的封装，以及历史管理器对 Command 协议的依赖。

## 四、质量保证手段

### 4.1 按需求组织验收

我以作业的通用约定、命令细则、错误信息和典型会话建立检查范围，再用不同层次的测试验证。

| 验收范围 | 重点检查内容 | 主要测试文件 |
| --- | --- | --- |
| REPL 与解析 | 提示符、EOF、整行注释、颜色中的 #、引号中的空格和中文、错误后继续运行 | `Repl.test.ts`、`CommandTokenizer.test.ts`、`Cli.test.ts` |
| 图形与文档 | 六类型创建、浮点几何、属性白名单、唯一且大小写敏感的 ID、受控父子关系和无环树 | `Shapes.test.ts`、`ShapeFactory.test.ts`、`SvgDocument.test.ts` |
| 编辑与历史 | 一条编辑一个单元、快照隔离、删除恢复、失败回滚、redo 分支、查询不影响历史 | `DocumentMemento.test.ts`、`HistoryManager.test.ts`、`ReversibleEdits.test.ts` |
| 结构编辑 | 跨父级分组、原顺序、解组位置、根级限制、循环检测、同级前后顺序 | `HierarchyCommands.test.ts`、`HierarchyCli.test.ts` |
| 文件与 IO 屏障 | 缺 ID 预留补全、XML 往返及转义、坏文件、不可写路径、默认路径、失败保留历史 | `SvgCodec.test.ts`、`SvgFileStorage.test.ts`、`StorageSession.test.ts`、`FileCli.test.ts` |
| 作业原文场景 | 典型会话、show/tree 格式、复杂背景示例、两节点流程图 A、最小 SVG | `AssignmentAcceptance.test.ts` 及 `tests/fixtures/` |

其中，`AssignmentAcceptance.test.ts` 有 5 项作业级验收。完整会话检查归一化提示符和对齐空格后，逐项比较反馈内容、错误消息、坐标和树节点。复杂背景案例还检查导入属性在编辑、删除、分组、解组和历史恢复后的完整性。

### 4.2 错误场景与状态一致性检查

我围绕“失败不改变状态”的要求，设置了以下检查：

- 一组图形中较后的节点发生数值溢出，整组坐标及历史都保持原状。
- undo 后执行非法编辑、错误语法或失败 IO，原 redo 仍然可以执行。
- 导入文件既有无名元素又有后面的显式 ID，自动分配不会抢占后者；文件整体非法时不发布部分文档或补 ID 警告。
- 保存到不可写目标时，原文件内容、会话默认路径和历史保持不变；异步 IO 尚未结束时阻止新的编辑和其他 IO。
- 成功 save/read 后，undo 与 redo 都返回作业规定的禁用错误；下一条成功编辑重新建立可撤销历史。

这些测试比较操作前后的文档树、属性、父级、顺序和历史可用性。

### 4.3 构建、类型与自动回归结果

验收环境为 Node.js 20.20.1、npm 10.8.2、TypeScript 5.9.3。项目启用 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等检查，使用 Node.js 内置 test runner。

从工程根目录可以复现：

```bash
npm ci
npm run typecheck
npm run build
npm test
```

代码验收记录如下：

| 检查 | 结果 |
| --- | --- |
| TypeScript 类型检查 | 通过 |
| 生产构建 | 通过 |
| 自动测试 | 146 项通过，0 项失败、0 项跳过 |
| 生产源码检查 | 58 个类均同名独立文件；静态模块依赖符合方案；未发现 switch 语句 |
| Git diff 空白检查 | 通过 |

### 4.4 用浏览器确认保存后的 SVG 外观

我通过浏览器自动化比较原 SVG 与读入后重新保存的 SVG，检查文字、描边和图形位置的显示效果。

| 固定样本 | 检查重点 | 尺寸 | 不同像素数 |
| --- | --- | --- | --- |
| background | 作业背景示例的嵌套平移、等比缩放和文字居中 | 400×200 | 0 |
| minimal | 作业最小 SVG 的图形位置及连线 | 400×200 | 0 |
| inheritance | 继承字号、相对字号及描边宽度 | 400×200 | 0 |
| relative-font | 未指定绝对字号时的相对字体处理 | 400×200 | 0 |

比较方式是在同一浏览器环境中将两幅图绘制到 Canvas 后读取像素；四组样本的累计通道差异与最大通道差异也均为 0。此外，两节点流程图已实际预览，确认矩形、中文文字与连线能够显示。

<details>
<summary>查看浏览器对照截图</summary>

![原 SVG 与导入后保存结果的左右对照，以及两节点流程图预览](https://raw.githubusercontent.com/wanjiu09/advanced-software-technology-lab1/final/doc/images/svg-comparison.png)

</details>
