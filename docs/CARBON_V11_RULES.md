# TradePilot — Carbon Design System v11 全站实施规范

> 规范来源：项目所有者在 2026-11-15 提供的完整规范。适用范围：TradePilot 全部页面、公共组件、UI Shell、响应式布局及交互状态。
>
> **规则优先级：** Carbon 官方文档与当前安装版本的实际 API > 本规范 > 现有代码。遇到不确定的 API、prop、token、SCSS 路径必须标记“待核对官方文档”，不得猜测或编造。
>
> **业务保护：** 只改界面层。业务逻辑、路由语义、数据流、接口调用、API payload、数据库 schema、权限、校验规则和任务状态转换保持不变。任何必要的行为变更必须先单独取得确认。

## 0. 角色、技术栈与执行纪律

- 扮演精通 IBM Carbon Design System v11 的资深前端工程师与设计系统审查员。
- 项目当前框架经仓库核实为 React 19 + TypeScript + Vite 7，Carbon React 依赖为 `@carbon/react@1.120.0`。本项目不是 Next.js 或 Vue。
- 允许的 UI 依赖：`@carbon/react` v11、`@carbon/icons-react`、`@carbon/charts-react`、`@carbon/motion`（如确有需要，先核对包与 API）。不得擅自引入 `@carbon/ibm-products`；如需 PageHeader、EmptyState 等产品组件，先征求所有者许可。
- 字体使用 IBM Plex Sans / IBM Plex Mono，通过 Carbon Sass 方式引入。中文回退仅允许在全局字体栈一处追加 PingFang SC、Microsoft YaHei，并写明注释。
- 全局主题统一；当前项目基线为 White。主题切换只使用 Carbon Theme / GlobalTheme 正式 API，不自建主题变量。
- “重读规则”：逐条复述本文件第 2 至第 12 节，并用其检查此前输出及当前修改代码；不得只回复已知悉。
- 不确定的组件属性、token、SCSS 路径，标记“待核对官方文档”，先查官方文档与当前安装包导出，不得编造。

## 1. 技术底座

- React / TypeScript / Vite；路由以现有 `src/app/App.tsx` 的路由映射为基线。不得擅自替换路由方案或造成整页刷新。
- 只使用 Carbon React v11、Carbon Icons React、Carbon Charts React（图表）及确有必要且核对过的 Carbon motion API。
- 不得未经许可引入 `@carbon/ibm-products`。
- IBM Plex 字体通过 Carbon Sass 引入；主题统一使用 Carbon theme API。
- Sass 使用模块命名空间写法。用户提供的示例路径与变量在逐项验证前均按“待核对官方文档”处理，不得假设 `@use` 子模块路径或 token 名一定存在。

## 2. 全局禁令

1. 禁止硬编码颜色值（hex、rgb、hsl）；颜色只使用 Carbon theme token。
2. 禁止硬编码 font-family、font-size、font-weight、line-height、letter-spacing；文字使用 Carbon type token。
3. 禁止硬编码 px 间距；间距使用 Carbon spacing token 或官方布局组件间距。
4. 禁止自写 border-radius、box-shadow、linear-gradient、filter、backdrop-filter（Carbon 组件自带样式除外）。
5. 禁止 emoji、图片图标、字体图标；图标只使用 `@carbon/icons-react`。
6. 禁止覆盖 Carbon 内部 `.cds--*` class；禁止 `!important`。
7. 禁止自写 `outline: none`；焦点样式由 Carbon 提供。
8. 禁止手写组件替代 Carbon 官方组件。没有合适组件或属性时先停下并询问。
9. 唯一全局字体例外：全局样式一处，在 Carbon 字体栈末尾追加 PingFang SC、Microsoft YaHei 中文回退，并加注释。

## 3. 栅格与页面边距

- 断点基准：sm 320px / 4 列；md 672px / 8 列；lg 1056px / 16 列；xlg 1312px / 16 列；max 1584px / 16 列。实现以 Carbon 当前 Grid 实际断点和官方 API 为准。
- 页面内容放在 Carbon `Grid` / `Column` 内；常规全宽列写法目标为 `<Column sm={4} md={8} lg={16}>`，并按实际断点补齐 xlg / max 配置。
- 页面左右边距、列间距由 Grid 自身提供；禁止页面外层手写 padding、margin、max-width。
- 最大内容宽度遵循 Carbon max 断点，超出后居中，不无限拉伸。
- 默认 Grid：表单页、详情页、看板页；`Grid narrow`：卡片密集看板；`Grid condensed`：整页数据表格。各属性必须先核对当前 Carbon API。
- 表单在 lg 及以上不超过 8 列；纯文字说明区不超过 8 列；表格和图表可占 16 列。
- Column 内二次分栏使用官方嵌套 Grid，不用自写 flex 凑列宽。
- 主内容使用 Carbon `Content`，正确避让 Header / SideNav，不被遮挡，不产生双滚动条。Header 48px、SideNav 256px 是本项目布局目标，最终以 Carbon UI Shell 结构和实际测量验收。

## 4. 间距与垂直节奏

只使用以下 Carbon spacing token：
- spacing-01 2px；02 4px；03 8px；04 12px；05 16px；06 24px；07 32px；08 40px；09 48px；10 64px；11 80px；12 96px；13 160px。

项目统一节奏：
| 位置 | 规范 |
|---|---|
| 面包屑 → 页面标题 | spacing-03（8px） |
| 页面标题 → 页面操作或内容 | spacing-06（24px） |
| 区块标题 → 区块内容 | spacing-05（16px） |
| 同页区块之间 | spacing-07（32px）；大区块 spacing-09（48px） |
| 表单字段之间 | Stack gap={6}（24px）；Stack API 需核对 |
| 表单分组之间 | Stack gap={7}（32px）；Stack API 需核对 |
| Tile 内边距 | spacing-05（16px） |
| 页面底部留白 | spacing-07（32px） |
| 工具栏 ↔ 表格 | 使用 TableContainer 自带结构，不额外叠加间距 |

同级元素间距必须一致，不得混用相近但不统一的数值。

## 5. 排版与字体

- 英文、数字：IBM Plex Sans；代码、ID、单号、金额等需对齐内容：IBM Plex Mono，使用 Carbon font-family mixin / type class，具体 API 待核对。
- 中文使用 Carbon 字体栈系统回退；不引入第三种字体（全局回退例外见第 2 节）。
- 字重只允许 Light 300、Regular 400、SemiBold 600；禁止 700 / bold。
- 产品界面只用 productive type token，不用 expressive。目标 token：
  - 页面标题：productive-heading-04
  - 区块标题：productive-heading-03
  - 卡片/弹窗/面板标题：productive-heading-02
  - 小节标题：productive-heading-01
  - 正文：body-01；长文 body-02；紧凑正文 body-compact-01
  - 输入标签 label-01；辅助说明 helper-text-01；图注/时间 caption-01；代码 code-01
  - KPI：productive-heading-05，最大不超过 productive-heading-06
- 禁止使用上述清单之外字号；同页层级不超过 5 级（目标 28 / 20 / 16 / 14 / 12），常规页面 3–4 级。
- 标题必须兼具视觉 type token 和语义层级；每页一个 h1，不跳级。规范中提到的 Carbon `Section` / `Heading` 组件是否存在需核对；不能据此臆造 API。允许使用语义 HTML 标题并通过 Carbon type token 设置视觉样式。
- 左对齐文本；数字列右对齐；禁止两端对齐、大段居中、全大写、斜体、装饰性下划线。链接使用 Carbon Link。
- 正文行长约不超过 60 个中文字或 80 个英文字符，通过 Grid 列宽控制。
- 文本颜色只用语义 token：text-primary、text-secondary、text-placeholder、text-helper、text-error、text-on-color、text-inverse、link-primary。
- 长文本截断使用 Carbon Truncate 或 Tooltip，不手写 text-overflow。

## 6. 颜色、层级与主题

- 颜色 token 范围：background、layer-01/02/03、layer-accent-01、field-01/02；border-subtle-01、border-strong-01；interactive、focus、background-hover；icon-primary/secondary；support-error/success/warning/info。
- Token 的完整拼写和当前主题变量映射必须以已安装 Carbon 版本官方文档/包导出为准；不确定项标记“待核对官方文档”。
- 层级为 background → layer-01 → layer-02 → layer-03；嵌套容器使用 Carbon `Layer`，不手选颜色。
- 状态不能只靠颜色表达，必须配图标或文字，优先 Carbon Tag、通知等正式组件。
- 品牌色只能通过 Carbon 主题机制 token 覆盖；需要品牌定制先询问。
- 分隔线和边框用 Carbon border token，宽度由组件提供。
- 图表使用 Carbon Charts 官方色板，不自定义颜色、不使用渐变。

## 7. 图标、动效与交互状态

- 图标只用 `@carbon/icons-react`，尺寸 16 / 20 / 24 / 32，默认 16。
- 纯图标操作使用 Carbon 可访问按钮模式，必须提供 tooltip、label 和 aria-label；`IconButton` 是否为当前版本正式导出需核对，不得臆造。
- 图标颜色来自 icon token。
- 动效只使用 Carbon productive motion token / `@carbon/motion` 正式 API；例如 duration-fast-01、duration-moderate-01 需核对实际包导出。
- 不做装饰动画；尊重 prefers-reduced-motion。
- hover、active、focus、disabled、selected、error、readonly 使用 Carbon 控件内置状态，不自定义状态色。
- 控件尺寸只用 Carbon size：sm 32px、md 40px、lg 48px；同一行/工具栏尺寸一致。每个组件支持的 size 值须按官方 API 核实。

## 8. 页面骨架（UI Shell）

- Header 使用 Carbon UI Shell：Header、SkipToContent、HeaderMenuButton、HeaderName、HeaderNavigation、HeaderMenuItem、HeaderGlobalBar、HeaderGlobalAction。Header 固定顶部，目标 48px。
- Header 操作（搜索、通知、用户）必须具备真实功能或明确禁用/不可用状态；不能只有装饰图标而声称功能可用。所有图标操作需 aria-label 和 tooltip。
- SideNav 使用 SideNav、SideNavItems、SideNavLink、SideNavMenu、SideNavMenuItem、SideNavDivider。一级菜单当前项目目标为 Agent 工作台、潜客发现、订单中心；最多一层二级菜单；一级菜单配置 Carbon icon renderIcon。
- 当前选中态由路由计算，使用 isActive 和 aria-current；不得写死。
- 响应式：lg 及以上 SideNav 常驻；小屏默认收起，由 Header hamburger 控制；展开时有遮罩，遮罩点击关闭。Header 与 SideNav 共用同一展开状态，优先使用 Carbon HeaderContainer 组合。断点与 HeaderContainer 的精确 API 待核对官方文档。
- 路由适配现有导航，不整页刷新。
- 页面统一结构：Breadcrumb → 页面标题 → 页面级操作 → 内容区。

## 9. 组件规范

### 按钮
- 只用 Primary / Secondary / Tertiary / Ghost / Danger。
- 单屏最多一个 Primary。
- 按钮组使用 ButtonSet；主操作右侧、次操作左侧。
- 文案动词开头，不超过 4 个汉字或 3 个英文单词。
- 删除等破坏性操作使用 Danger，并经 Modal 二次确认。

### 表格
- 统一使用 DataTable，按需 TableToolbar、TableToolbarSearch、TableBatchActions、TableSelectRow、Pagination。
- 数字右对齐，文本左对齐；金额/编号使用 Plex Mono。
- 行内最多 2 个直接操作，其余放 OverflowMenu。
- 提供 sm / md / lg 行高切换，默认 md；密集表格默认 sm。组件是否支持相关 size 必须核对。
- 必须有 DataTableSkeleton、空数据、加载失败三态。
- 小屏只允许表格容器内部横向滚动，页面本身不横向溢出。

### 筛选与搜索
- 使用 Search、Dropdown、MultiSelect、ComboBox、DatePicker；已选条件用可关闭 Tag。
- 筛选栏在表格上方，使用 TableToolbar 或 Carbon Grid；提供 Ghost“重置”。

### 表单
- 使用 Form、TextInput、TextArea、NumberInput、Select、Checkbox、RadioButtonGroup、Toggle、FileUploader。
- 标签在控件上方；必填标记按 Carbon 规范；校验用 invalid + invalidText；提示用 helperText。
- 使用 Stack 管理字段垂直间距，FormGroup 管理分组，长流程用 ProgressIndicator。Stack API 待核对。
- 表单底部主按钮“保存/提交”，次按钮“取消”。

### 弹窗与反馈
- 确认使用 Modal（破坏性使用 danger 变体）；复杂编辑使用 ComposedModal。
- 页内提示 InlineNotification；短暂反馈 ToastNotification。
- 加载使用 Loading、InlineLoading、SkeletonText。
- 每个弹窗仅一个主操作。

### 容器与展示
- 卡片使用 Tile；可点击用 ClickableTile；分区切换仅在确有内容分区语义时使用 Tabs；折叠用 Accordion。
- 不自造卡片阴影和圆角。
- EmptyState 需先征求是否允许引入 `@carbon/ibm-products`。未经许可，使用 Tile + heading-02 + body-01 + 至多一个按钮的最小组合。

## 10. 数据与文案

- 日期 YYYY-MM-DD；时间 HH:mm；跨时区业务显示时区。
- 数字千分位；金额带币种、固定小数位、右对齐。
- 空值统一显示“—”，不留空，不显示 null / undefined。
- 文案简洁直接，不用感叹号，不用“请”开头的冗长句。
- 按钮动词开头（保存、创建、导出、删除）。
- 错误信息说明原因和解决办法；破坏性确认写明对象和不可撤销后果。
- 同一概念全站只使用一个术语。

## 11. 响应式

- 依次按 sm → md → lg 验证，不得横向溢出。
- sm / md：SideNav 收起；Grid 单列或双列堆叠；表格仅在自身容器内横向滚动。
- lg：SideNav 常驻；表单不超过 8 列。
- xlg / max：内容随 Grid 扩展至 max 后居中，不无限拉伸。
- 可点击目标不小于 Carbon 默认 md 40px。

## 12. 无障碍

- 所有交互元素键盘可达，焦点顺序合理，焦点可见，使用 Carbon 自带焦点样式。
- 图标按钮、无可见标签搜索框等必须有 aria-label。
- 对比度满足 WCAG 2.1 AA；状态不只靠颜色。
- 表单错误与控件关联（invalidText）；通知使用 Carbon 组件提供的 live region 语义。
- 页面正确设置 lang，提供 SkipToContent。

## 13. 强制执行阶段

每阶段结束必须提交交付物和自检报告，等待所有者明确确认后才进入下一阶段。

### 阶段 0：盘点方案（不改业务代码、不改界面）
- 列出所有现有页面、路由、公共组件、共享样式和动态/嵌套控件。
- 逐项标注 Carbon 对应组件、改造难度、风险点。
- 列出现有实现与本规范冲突点。
- 提出按依赖关系和风险排序的改造顺序。
- 盘点报告交付后等待确认。

### 阶段 1：地基
- 安装/核对依赖、lockfile、Carbon Sass 与字体、主题、全局样式、Layout（Header + SideNav + Content）。
- 只在阶段 0 经确认后启动。

### 阶段 2：公共组件
- 统一按钮区、表单控件、弹窗、通知、空/加载/错误状态、页面标题区。
- 只做 Carbon 薄封装，不复制或仿写 Carbon 视觉样式。

### 阶段 3：逐页改造
- 每次只改一个页面；按所有者确认的页面优先级执行。
- 每页完成：控件盘点 → Carbon 组件映射 → 界面改造 → 行为回归 → 响应式/无障碍检查 → 部署 → 线上验收。
- 用户验收当前页面后，才开始下一页。

### 阶段 4：全局审查
- 对全站代码、所有路由和条件 UI 状态执行第 14 节检查并输出报告。

## 14. 每阶段自检清单

### 样式与 token
- [ ] 无硬编码颜色值（扫描 #、rgb、hsl）
- [ ] 无硬编码 font-family/font-size/font-weight/line-height/letter-spacing；无 700 / bold
- [ ] 无手写 px 间距；无手写页面左右 padding / margin
- [ ] 无自写 border-radius / box-shadow / linear-gradient
- [ ] 无覆盖 .cds--*；无 !important；无 outline: none

### 排版与布局
- [ ] 所有文本有对应 Carbon type token；字号层级不超过 5 级
- [ ] 每页一个 h1，标题不跳级，使用 Carbon type token
- [ ] 内容位于 Grid / Column；表单不超过 8 列
- [ ] 垂直间距符合第 4 节
- [ ] 页面结构为 Breadcrumb → 标题 → 操作 → 内容

### 组件与交互
- [ ] 图标全部来自 Carbon Icons，尺寸 16 / 20 / 24 / 32
- [ ] 一屏最多一个 Primary；同工具栏控件 size 一致
- [ ] 表格、表单、弹窗具备加载、空、错误三态
- [ ] 状态不只靠颜色表达

### 无障碍与响应式
- [ ] 所有交互元素有 aria-label 或可见文字，键盘可达
- [ ] sm / md / lg 无整页横向溢出
- [ ] 动效使用 Carbon motion token，尊重 prefers-reduced-motion

## 15. 阶段交付格式

每阶段必须输出：
1. 完整可运行代码（涉及的组件文件 + SCSS），按文件路径分段，不省略，不写“其余同上”。
2. 改动清单：使用的 Carbon 组件、仍然自定义的部分及理由。
3. 自检清单结果；未通过项说明原因和修复方案。
4. “待核对官方文档”的 API / token 单独列出。
5. 需要所有者决策的问题放在最后。

---

## 官方文档核验记录

- Carbon Grid / Column：Carbon 2x Grid 官方文档（CSS Grid，16 列响应式系统）。
- Carbon productive typography：使用 `productive-heading-*` type style，官方 Sass mixin 为 `type-style`（具体命名空间按安装版本核对）。
- Carbon spacing：spacing token 来自 Carbon layout 包；当前 `@carbon/react` 项目可用其内置样式资源。
- Carbon Theme / Layer：使用官方 Theme / GlobalTheme 与 Layer；具体组件导出与组合方式以当前 v11 API 为准。
- Carbon UI Shell：Header、左侧导航、右侧操作栏为统一 UI Shell 模式；SideNav 仅支持一级子菜单。
- 任何文档未明确或与当前安装版本不一致的内容，一律列为“待核对官方文档”，不臆造。

## 变更记录

- 2026-11-15：由项目所有者提供的全站 Carbon v11 规范整理为仓库级实施规则。阶段 0 完成并经所有者确认前，不执行阶段 1。
