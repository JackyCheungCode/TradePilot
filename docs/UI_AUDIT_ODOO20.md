# TradePilot 全站 UI 审计报告（Odoo 20 对照）

> 审计基准：Odoo 20.0 官方 Web Client、View Records、View Architectures 与 Studio Views 文档。  
> 审计范围：`develop` 分支静态代码审查；未进行已登录生产环境的逐屏人工验收。本文区分代码已确认的问题与需要运行时验证的项目，不把推断写成事实。

## 1. 审计结论

当前 TradePilot 已建立 shadcn/ui 基础组件和 Odoo-inspired CSS，但尚未形成完整、统一的 Odoo 式工作区体系。主要问题是页面级实现分散、全局 CSS 多轮叠加、列表/筛选/表单缺少统一契约，以及移动端数据视图未按任务类型转换。

**结论：先重构共享 UI 基础层，再迁移业务页面；不建议继续通过全局 CSS 末尾追加规则修补。**

## 2. 对照原则

Odoo 20 的关键不是复制配色，而是复用一致的 Web Client 与记录视图模型：

- Web Client 负责应用导航、当前 Action、面包屑与主工作区。
- 同一业务记录按任务选择 List、Form、Kanban、Calendar、Graph、Pivot、Map 等视图。
- Search 视图统一承担搜索、过滤、分组；搜索条件作用于当前记录视图。
- Form 视图承担单记录创建/编辑，字段应分组、对齐，并明确主次操作与状态。
- Kanban 用于流程阶段或适合卡片阅读的记录；不是把所有列表都改成卡片。
- 移动端应提供适合触控和窄屏的记录呈现，不能把桌面宽表格简单压缩或长期依赖横向滚动。
- Odoo 的表单 Notebook/页签是记录内部的信息分区，不等于用 Tabs 取代应用主导航。TradePilot 主导航继续使用侧边栏。

参考：
- Odoo 20 Framework Overview: https://www.odoo.com/documentation/20.0/developer/reference/frontend/framework_overview.html
- Odoo 20 View Records: https://www.odoo.com/documentation/20.0/developer/reference/user_interface/view_records.html
- Odoo 20 View Architectures: https://www.odoo.com/documentation/20.0/developer/reference/user_interface/view_architectures.html
- Odoo 20 Studio Views: https://www.odoo.com/documentation/20.0/applications/studio/views.html
- Odoo 20 Client Framework 101: https://www.odoo.com/documentation/20.0/developer/tutorials/client_framework_101.html

## 3. 已确认的代码问题

### P0 — 设计 Token 与 CSS 治理

文件：`src/styles/globals.css`

- 多次重复声明 `:root`、`body`、`.tp-page-canvas` 等全局规则。
- `--tp-accent` 定义为 `#714b67`，与产品已确认的黑/灰品牌方向不一致；同时页面还直接覆盖 primary、text、border 等语义色。
- 全局选择器直接覆盖 `main input`、`main button`、`main table` 等元素，可能改变不同业务组件的预期状态。
- 使用 class 字符串匹配覆盖颜色/尺寸（例如 `button[class*="bg-primary"]`、`.text-2xl`），脆弱且难以追踪。
- 移动端全局强制表格 `min-width: 640px`，会把窄屏页面推向横向滚动，而不是按视图类型提供响应式呈现。

整改：整理成单一 Token 层、语义组件层、布局层；移除全局元素级视觉覆盖，页面仅通过共享组件 variants 和明确 layout classes 控制。

### P1 — AppShell 与页面职责边界

文件：`src/app/layouts/AppShell.tsx`、`src/app/App.tsx`

- AppShell 根据 activePage 生成页面标题，同时多个页面组件又自行渲染完整标题、描述和操作按钮，存在重复控制区的风险。
- 页面路由、导航标签、标题映射分散在 App 与 AppShell 两处，新增页面容易出现导航、标题和路由不一致。
- 缺少统一的页面级控制面板契约（标题、面包屑、主操作、次操作、搜索/视图工具栏插槽）。
- 应明确“应用导航属于 AppShell；页面控制面板由共享 PageLayout/ControlPanel 负责；业务页面只提供内容与动作”。

整改：建立集中式 route metadata 与共享 PageLayout/ControlPanel，不在每个页面重复造标题区。

### P1 — 页面列表、搜索与筛选

文件示例：
- `src/features/crm/presentation/pages/LeadsPage.tsx`
- `src/features/master-data/presentation/pages/MasterDataPage.tsx`
- `src/features/document-center/presentation/pages/OrderCenterPage.tsx`
- `src/features/lead-discovery/presentation/pages/DiscoveryResultsPage.tsx`
- `src/features/lead-discovery/presentation/pages/DiscoveryTasksPage.tsx`

已确认：
- CRM 主数据页面将搜索、过滤字段、过滤值、分组、排序字段、排序方向组合在一个工具栏中；控件在窄屏统一变成 100% 宽度，信息层级与组合方式需要重构。
- 订单中心页面内自行实现搜索、状态过滤、排序、分页、批量选择和操作，尚未体现为可复用的数据视图模式。
- 多个业务页面各自实现表格、空状态和分页，交互与密度难以统一。

整改：建立统一 ListView/DataTable 模式：搜索输入、过滤器、分组、排序分层组织；显示活动筛选条件与一键清除；统一分页、批量动作、空/加载/错误状态。

### P1 — 移动端列表与卡片

文件：`src/features/document-center/presentation/pages/OrderCenterPage.tsx`、`src/styles/globals.css`

- 订单列表有 `min-w-[1050px]` 和 `min-w-[900px]`，移动端只能横向滚动。
- 全局 CSS 对移动端表格设置 `min-width: 640px`，会放大这一问题。
- 现有 `.tp-mobile-card-grid` 规则存在，但需逐页核实统计卡片是否实际使用该 class。
- 产品负责人已明确要求：移动端统计卡片全站两列；适合卡片化的记录列表也应采用两列或单列紧凑记录布局，不能把“所有卡片两列”误解为复杂订单记录必须强行两列。

整改：统计 KPI 固定两列；简单记录卡片按两列；订单、单据等复杂记录优先单列紧凑卡片/摘要列表，提供关键字段和操作，不做宽表格横向拖动。

### P1 — 表单结构与字段控件

文件示例：`src/features/document-center/presentation/pages/OrderCenterPage.tsx`、`src/features/master-data/presentation/pages/MasterDataPage.tsx`

- 订单编辑字段分组已有雏形，但仍以大量裸 Input 和按钮拼装；字段标签、说明、必填、验证、只读和错误状态没有统一 FormField 契约。
- 多处以 placeholder 承担字段名称，长表单的可读性和可访问性不足。
- 需要核对自定义 Combobox/Select 是否覆盖全部选择场景，禁止退回浏览器原生 select。
- 日期、国家/地区、关联客户/联系人、产品选择器应统一交互模式。

整改：统一 FormSection、FormField、RelationPicker、DatePicker；placeholder 只作示例，不替代 label；表单按业务分区并明确主次动作。

### P1 — 发现渠道与任务中心

文件示例：
- `src/features/lead-discovery/presentation/pages/FacebookDiscoveryPage.tsx`
- `src/features/lead-discovery/presentation/pages/InstagramDiscoveryPage.tsx`
- `src/features/lead-discovery/presentation/pages/SearchEngineDiscoveryPage.tsx`
- `src/features/lead-discovery/presentation/pages/DiscoveryTasksPage.tsx`
- `src/features/lead-discovery/presentation/pages/DiscoveryResultsPage.tsx`

- Facebook 页面自建检索对象多选 Popover、任务轮询、日志状态展示；渠道间任务控制台样式应收敛为共享 DiscoveryTaskPanel。
- 搜索条件、执行状态、日志、结果入口需要在渠道间一致，不能因不同 provider 出现不同布局与状态语义。
- 渠道专有配置可以不同，但任务状态、进度、日志、错误、结果链接应统一。

整改：建立 DiscoverySearchForm、TaskExecutionPanel、TaskLog、ResultSummary 等共享业务组件，渠道页面只注入渠道参数。

### P2 — 可访问性与交互状态

全站需系统验收：
- 所有输入均有可访问名称，不依赖 placeholder。
- 菜单、Popover、Dialog、Combobox 可键盘操作，焦点可见且关闭后回归触发器。
- 加载、空、错误、禁用、成功状态明确；状态不只依赖颜色。
- 危险操作使用确认机制；批量操作显示选中数量与可用动作。
- 手机触控目标、弹层边界、固定页头/滚动容器经过真实设备验证。

## 4. 全站页面审计矩阵

等级定义：P0 = 先解决的基础风险；P1 = 主要业务体验问题；P2 = 完善项。状态“待运行时验收”表示代码审阅不足以确认真实屏幕表现。

| 页面/模块 | 重点审计点 | 当前静态审计结论 | 优先级 |
|---|---|---|---|
| 登录 | 表单标签、错误、加载、窄屏 | 待运行时验收 | P2 |
| Agent 工作台 | 主工作区、聊天布局、工具区响应式 | 独立复杂页面，需专项验收 | P1 |
| Agent 市场 | 卡片密度、筛选、空状态 | 待运行时验收 | P2 |
| Agent 编排 | 节点画布、属性面板、窄屏交互 | 专用交互，需专项验收 | P1 |
| 外部 Agent 接入 | 配置表单、连接状态、危险操作 | 需统一设置表单模式 | P1 |
| Agent 执行记录 | 运行列表、日志、状态与筛选 | 应复用任务列表模式 | P1 |
| Agent 审批中心 | 待审批队列、批量操作、详情 | 应强化状态与操作层级 | P1 |
| Agent 设置/形象设计 | 设置分组、预览、保存状态 | 需统一设置页布局 | P2 |
| 地图与本地商家 | 地图/列表分栏、窄屏切换 | 地图专用布局，需真机验收 | P1 |
| 搜索引擎发现 | 条件顺序、执行状态、任务面板 | 应与其他发现渠道共享模式 | P1 |
| Facebook 发现 | 多选对象、条件、任务日志 | 页面自建任务交互，应抽共享组件 | P1 |
| Instagram 发现 | 与 Facebook 的配置/任务一致性 | 应统一任务控制台 | P1 |
| 发现任务中心 | 来源标记、状态、日志、筛选 | 统一列表和状态语义 | P1 |
| 发现结果中心 | 来源分组、筛选、批量操作 | 统一数据列表和响应式记录视图 | P1 |
| CRM 线索 | 搜索、过滤、分组、排序、转化动作 | 需要统一 Search/List 模式 | P1 |
| CRM 客户/联系人/商机 | 多字段筛选、关联关系、详情 | 控件过密；需要 Form/List 模式 | P1 |
| 产品资料/产品配置 | 分类、产品变体、关系字段 | 需要主数据表单规范 | P1 |
| 企业配置 | 字段分组、只读/编辑、关系信息 | 需要主数据表单规范 | P1 |
| 报价与询价 | 列表、状态动作、单据关联 | 需统一 List 与记录详情 | P1 |
| 销售业务 | 订单字段、批量动作、移动端记录 | 固定宽表格是明确问题 | P1 |
| 采购业务 | 订单字段、供应商、移动端记录 | 固定宽表格是明确问题 | P1 |
| 单据工作台 | 状态、快捷操作、关联业务 | 需统一工作台卡片与动作 | P1 |
| 单据制作 | 长表单、预览、保存/签发流程 | 需统一 Form/Document Workspace | P1 |
| 单据管理 | 搜索、筛选、版本、操作 | 需统一列表和详情模式 | P1 |
| 单据模板 | 模板列表、预览、编辑 | 需统一设置/列表模式 | P2 |
| AI 与 API 集成 | Provider 分组、凭据状态、模型配置 | 需统一配置页，不暴露密钥 | P1 |
| 搜索排除规则 | 批量编辑、代码式输入、校验 | 需统一配置编辑器与反馈 | P2 |

## 5. 目标组件体系

基础组件继续使用 shadcn/ui，不引入第二套 UI 框架。新增的是业务组合组件：

- AppShell：侧边栏、顶部导航、用户菜单、工作区容器。
- PageLayout：面包屑、标题、描述、主/次操作插槽。
- SearchControlPanel：搜索、过滤器、分组、排序、保存搜索。
- ListView：列配置、排序、分页、批量操作、空/加载/错误状态。
- RecordCard / MobileRecordList：移动端记录呈现。
- FormLayout / FormSection / FormField：字段分区、标签、说明、验证和只读状态。
- StatusBadge / StatusBar：统一状态语义。
- TaskExecutionPanel / TaskLog：发现与 Agent 任务执行状态。
- SettingsLayout：设置分类、配置表单、连接测试与保存反馈。

## 6. 推荐整改顺序与验收门槛

### Phase 1 — UI Foundation（先做）
1. 清理 globals.css，建立单一 Token 文件/层级。
2. 统一页面宽度、字体、间距、背景层级、边框、圆角和控件高度。
3. 建立 PageLayout 与 AppShell 职责边界。
4. 移除脆弱的全局 class 字符串选择器。
5. 增加 Storybook/组件展示页或可访问的组件验收页（如仓库现有工具链支持）。

### Phase 2 — Shared Business Views
1. SearchControlPanel。
2. ListView/DataTable。
3. MobileRecordList/RecordCard。
4. FormLayout/FormField。
5. TaskExecutionPanel。

### Phase 3 — 页面迁移
顺序：CRM/主数据 → 发现渠道/任务/结果 → 报价/销售/采购 → 单据中心 → Agent → 设置。

### Phase 4 — 验收
- 桌面：1440px、1280px、1024px。
- 手机：390px、360px；重点使用真实 Android 设备验收。
- 无意外横向页面溢出；复杂数据表有移动端替代视图。
- KPI 卡片在移动端两列。
- 无重复页面标题或重复主操作。
- 所有选择器使用共享自定义组件，不使用原生浏览器 select。
- 所有页面覆盖 loading/empty/error/disabled/success 状态。
- 键盘可完成核心操作，焦点可见，弹层不会被视口裁切。

## 7. 审计限制

本报告基于当前 `develop` 源码和 Odoo 20 官方文档进行静态审查。未登录线上生产环境逐页操作，也未在 360px/390px/1024px/1280px/1440px 视口运行视觉回归。因此矩阵中“待运行时验收”的项目不能视为已通过或已确认缺陷。后续页面迁移必须配合浏览器/设备截图和交互测试。

## 8. Implementation progress (2026-11-14)

### Phase 1 — UI Foundation

- Implemented in PR #9: `ui/odoo20-foundation-phase1`.
- Merged into `develop` and deployed to the production Worker.
- Includes unified global design tokens, AppShell navigation behavior, shared page control panel primitives, responsive record presentation, and removal of fragile global CSS selectors.
- CI passed for the merged implementation.
- Production login page was checked at 390px and 1440px. This is not a substitute for authenticated internal-page acceptance.

### Phase 2 — Shared Business Views

- Implemented in PR #10: `ui/odoo20-shared-business-views-phase2`.
- Current head: `079e90cbd48bfabcbef66f8848575f7925a67ffc`.
- Shared components include SearchControlPanel, ListViewShell, FormLayout, FormSection, FormField, StatusBadge, and TaskExecutionPanel.
- Migrated CRM leads, master data, order center, document center, discovery tasks/results, Agent run records, Agent market roles, external Agent connections, approvals, and saved workflows.
- Search Engine, Map/Local Business, Facebook, and Instagram now use the same task execution panel structure.
- CI run 43588415875 passed typecheck, tests, lint, frontend build, and Worker build.
- PR #10 remains Draft and has not been merged or deployed.

### Remaining acceptance gates

- Authenticated screenshots and interaction checks are still required at desktop 1440/1280/1024px and mobile 390/360px.
- Agent workspace and settings require further detail-level review.
- Verify keyboard/focus behavior, modal/popover viewport boundaries, loading/empty/error states, and no unexpected page-level horizontal overflow.
- Do not claim Odoo 20 visual parity until the authenticated screen-by-screen comparison is completed.
