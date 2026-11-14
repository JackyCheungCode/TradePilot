# TradePilot — Carbon v11 阶段 0 盘点报告

- 盘点分支：`develop`
- 盘点基线 commit：`0675e052b9b4abb8b8216441744f2643a28a5308`
- 盘点日期：2026-11-15
- 范围：React/Vite 应用路由、页面文件、共享 UI、AppShell、样式与依赖清单
- 本阶段不修改业务代码、页面代码或样式。

## 1. 技术底座现状

| 项目 | 现状 | 结论 |
|---|---|---|
| 框架 | React 19 + TypeScript + Vite 7 | 符合 React 技术方向 |
| 路由 | `src/app/App.tsx` 内自建 pathname / history 映射 | 保留，不替换路由逻辑 |
| Carbon React | `@carbon/react@1.120.0` | 已安装 |
| Carbon Icons | `@carbon/icons-react@11.92.0` | 已安装，但需扫描页面内残余非 Carbon 图标 |
| Carbon Charts | `@carbon/charts-react@1.27.24` | 已安装 |
| Sass | `sass@1.108.2` | 已安装 |
| 字体 | `@ibm/plex-sans`、`@ibm/plex-mono` | 已安装；需检查实际加载方式与全局字体回退 |
| Tailwind | Tailwind CSS v4 | 仍是全站布局/间距/颜色的重要来源，与禁令冲突 |
| 其他 UI/图标 | lucide-react、sonner、tailwind-merge、class-variance-authority | 需逐项判断是否仅作非视觉工具或替换为 Carbon |
| 主题 | `src/main.tsx` 使用 `<Theme theme="white">` | Carbon 主题已启用，样式层仍有自定义语义变量 |
| Sass 入口 | `src/styles/carbon.scss` 使用 `@use "@carbon/react"` | Carbon 样式入口已存在 |
| lockfile | 当前仓库树未见 package-lock.json / pnpm-lock.yaml / yarn.lock | 可复现依赖锁定需要补齐，纳入阶段 1 |

## 2. 路由与页面完整清单

> `App.tsx` 中有多个路由由同一页面组件通过 initialSection / initialView 切换；表格区分“路由入口”和“页面实现文件”，避免重复计数。

| 功能域 | 路由 | 页面实现 | 难度 | 主要风险 |
|---|---|---|---|---|
| 登录 | `/login` | `src/app/pages/LoginPage.tsx` | 中 | 登录态、表单校验、错误反馈不可改变 |
| Agent 工作台 | `/agent/workbench` | `AgentCenterPage.tsx`（workbench section） | 高 | 聊天工作区、执行面板、模型/工具状态和流式交互 |
| Agent 市场 | `/agent/market` | `AgentCenterPage.tsx` + `AgentMarketPage.tsx` | 高 | 市场卡片、安装/启用流程、状态控件 |
| Agent 编排 | `/agent/orchestration` | `AgentCenterPage.tsx` | 高 | 工作流节点/编排编辑器，复杂交互 |
| 外部 Agent 接入 | `/agent/connections` | `AgentCenterPage.tsx` | 高 | 协议、密钥、连接状态与测试 |
| 执行记录 | `/agent/runs` | `AgentCenterPage.tsx` | 中高 | 运行状态、日志、进度、详情面板 |
| 审批中心 | `/agent/approvals` | `AgentCenterPage.tsx` | 中高 | 审批状态、确认操作与权限 |
| Agent 设置 | `/agent/settings` | `AgentCenterPage.tsx` | 中 | 配置表单和保存行为 |
| Agent 外观 | `/settings/agent-appearance` | `AgentAppearanceSettingsPage.tsx` | 中 | 文件上传/预览、外观配置 |
| 地图商家发现 | `/lead-discovery/map-local-businesses` | `MapLocalDiscoveryPage.tsx` | 高 | 地图组件、地区选择、地图数据和任务执行 |
| 搜索引擎发现 | `/lead-discovery/search-engine` | `SearchEngineDiscoveryPage.tsx` | 高 | 搜索类型、多筛选、任务状态及结果 |
| Facebook 发现 | `/lead-discovery/facebook` | `FacebookDiscoveryPage.tsx` | 高 | 多对象类型、动态字段、采集状态和结果 |
| Instagram 发现 | `/lead-discovery/instagram` | `InstagramDiscoveryPage.tsx` | 高 | 账号/内容筛选、任务和多类型结果 |
| 潜客任务 | `/lead-discovery/tasks` | `DiscoveryTasksPage.tsx` | 中高 | 任务执行面板、进度、日志、取消/重试 |
| 潜客结果 | `/lead-discovery/results` | `DiscoveryResultsPage.tsx` | 高 | 多渠道字段差异、批量操作、详情/地图 |
| 线索 | `/crm/leads` | `LeadsPage.tsx` | 高 | 线索转客户、联系人、商机的事务流程 |
| 客户 | `/crm/accounts` | `MasterDataPage.tsx`（accounts） | 高 | 复杂主数据表单、关联关系、Logo 上传 |
| 联系人 | `/crm/contacts` | `ContactsPage.tsx` | 中高 | 编辑/归档确认、客户关系 |
| 商机 | `/crm/opportunities` | `MasterDataPage.tsx`（opportunities） | 高 | 阶段、金额、客户关联与状态 |
| 企业配置 | `/settings/enterprise` | `MasterDataPage.tsx`（company） | 中高 | 企业字段、配置持久化 |
| 产品配置 | `/settings/products` | `MasterDataPage.tsx`（categories） | 中 | 分类/配置表单 |
| 产品资料 | `/products` | `MasterDataPage.tsx`（products） | 中高 | 产品目录、筛选、详情和表单 |
| 报价与询价 | `/orders`、`/orders/quotations` | `OrderCenterPage.tsx`（quotations） | 高 | 报价明细、币种/金额、行编辑、状态 |
| 销售业务 | `/orders/sales` | `OrderCenterPage.tsx`（sales） | 高 | 订单明细、金额、状态与关联单据 |
| 采购业务 | `/orders/purchase` | `OrderCenterPage.tsx`（purchase） | 高 | 采购明细、金额、供应商和状态 |
| 单据工作台 | `/documents` | `DocumentCenterPage.tsx`（workbench） | 高 | 单据模板、动态内容、操作流 |
| 单据制作 | `/documents/create` | `DocumentCenterPage.tsx`（create） | 高 | 复杂编辑器、表单、预览和保存 |
| 单据管理 | `/documents/records` | `DocumentCenterPage.tsx`（documents） | 中高 | 列表、筛选、详情、下载 |
| 单据模板 | `/settings/document-templates` | `DocumentCenterPage.tsx`（templates） | 中高 | 模板配置与编辑 |
| AI 与 API 集成 | `/settings/integrations` | `IntegrationsSettingsPage.tsx` | 高 | ContentSwitcher、模型选择、密钥、连接测试 |
| 搜索排除规则 | `/settings/search-exclusions` | `SearchExclusionRulesPage.tsx` | 中 | 多选规则、编辑/删除与确认 |

**路由实现注意：** 路由由 App.tsx 内的 pathname 映射驱动；多个菜单项目前复用页面组件。阶段 3 不得因“逐页”改造而拆分/重构路由或改变初始 section。

## 3. 公共布局与共享组件盘点

| 文件 / 组件 | 当前职责与现状 | Carbon 目标 | 难度 | 风险 |
|---|---|---|---|---|
| `src/app/layouts/AppShell.tsx` | Carbon Header / SideNav 已接入；同时存在自定义 aside、移动端 dialog/backdrop、侧栏折叠状态和手动 body overflow 管理 | HeaderContainer、Header、SideNav、Content、HeaderMenuButton 等官方 UI Shell | 高 | 当前 Header 与 SideNav 并非完全由同一 Carbon shell 状态管理；重复/嵌套导航容器和自定义遮罩需核验；Header Global Actions 有图标展示但部分未接入真实功能 |
| `src/shared/ui/page-layout.tsx` | 自定义 PageControlPanel / PageSection / PageToolbar；breadcrumb 为手写 nav；标题通过 cds type class | Breadcrumb / BreadcrumbItem、语义标题、Grid / Column、Carbon spacing | 中 | h1 当前使用 heading-05 class；标题 token/页面标题顺序和 Grid 包裹不统一 |
| `src/shared/ui/primitives.tsx` | Button、Tile、Tag、TextInput、TextArea、NumberInput、DatePicker、Checkbox、ComboBox、MultiSelect、ProgressBar 的薄封装 | 保留 Carbon 组件本体，收紧类型与 Carbon props，清理非 Carbon 视觉语义 | 中高 | wrapper API 仍保留 default/outline/icon 等旧语义；部分 labelText 为空或 hideLabel；原生 HTML 属性桥接可能破坏 Carbon 校验/辅助文案语义 |
| `src/shared/ui/data-views.tsx` | SearchControlPanel、ListViewShell、FormLayout、FormSection、FormField、StatusBadge | Search、Tag、TableToolbar、FormGroup、Stack（若官方 API 支持）、InlineNotification | 中高 | 自定义 flex/grid/间距、手写 label/error、status 映射；需检查错误关联和 TableToolbar 结构 |
| `src/shared/ui/page-layout.css` | 页面标题、区块、工具栏自定义样式 | Carbon Grid + spacing/type tokens | 中 | 手写布局和 spacing |
| `src/styles/carbon.scss` | Carbon Sass 总入口，配置 per-family Plex | 保留并按 Carbon 官方 Sass 规范核对 | 低 | 需要核对是否同时引入了重复字体声明 |
| `src/styles/globals.css` | Tailwind v4 theme bridge 与自定义语义变量 | 逐步移除非 Carbon 设计 token 来源 | 高 | --radius 与多个颜色 alias 将产生非 Carbon token 和颜色硬编码 |
| `src/styles/design-tokens.css` | 自定义 CSS 变量映射 Carbon 变量，并回退硬编码色值 | 直接使用 Carbon theme tokens / Layer | 高 | 存在 hex fallback、非官方变量别名；变量名可能与当前 Carbon token 名不一致 |
| `src/styles/reset.css` | 自定义 body 字体、selection、focus、mono 字体 | Carbon type/font helpers 与 Carbon 默认 focus | 中 | 硬编码 font-family、颜色；自定义 focus-visible outline 与规范冲突 |
| `src/features/agent-center/presentation/agent-center.css` | Agent 页面局部布局/样式 | Carbon tokens、Grid、Tile、Stack/组件原生样式 | 高 | 需要逐条扫描硬编码尺寸/色值/圆角/阴影 |
| `src/app/pages/LoginPage.tsx` | 登录页 | Form、TextInput、PasswordInput（若当前组件 API）、Button、InlineNotification | 中 | 未登录独立布局，不应被 AppShell 内容结构套错 |
| `src/features/lead-discovery/presentation/components/TaskExecutionPanel.tsx` | 多个渠道复用任务配置/进度/日志 | Form、ProgressIndicator/ProgressBar、InlineLoading、DataTable/Tag | 高 | 多渠道共享行为，样式改造不得改变任务状态与回调 |
| `CountrySelect / RegionCityPicker` | 国家、地区/城市选择 | ComboBox / Dropdown / MultiSelect | 中高 | 自定义搜索/级联逻辑，保留选择值和回调契约 |
| `DiscoveryMap.tsx` | 地图渲染 | 地图本身可作为领域组件；外围筛选/容器用 Carbon | 高 | 地图画布不是 Carbon 控件，不得伪称原生 Carbon；控件层与地图层要分开验收 |
| `AgentChatWorkspace.tsx` | 聊天工作区 | Carbon TextArea、Button、Tabs（如确有分区）、Loading/Tag/Tile | 高 | 聊天消息、流式更新、快捷操作及滚动行为 |
| `CustomerAccountForm.tsx` | 客户主数据表单 | Form、TextInput、ComboBox、FileUploader、Checkbox 等 | 高 | 上传、验证、主数据保存流程 |
| API / domain / application 文件 | 业务逻辑、接口与模型 | 不做视觉迁移；仅必要时调整 UI adapter 的类型边界 | 不纳入视觉改造 | 严禁改变数据契约 |

## 4. 主要页面的控件与 Carbon 映射

| 页面域 | 现有控件/模式 | 目标 Carbon 组件 | 难度 / 风险 |
|---|---|---|---|
| Agent Center | 搜索、模型/协议 ComboBox、连接配置、启用 Switch、Tag、运行日志、工作区、卡片 | Search、ComboBox、Toggle、Tag、InlineLoading、ProgressIndicator、Tile、DataTable、Modal | 高；多种动态状态与任务行为 |
| Agent Market | Agent 卡片、搜索、分类、状态、安装/启用 | Tile/ClickableTile、Search、Dropdown/MultiSelect、Tag、Button | 中高；安装/启用事件 |
| Lead Discovery 渠道页 | 多选对象、国家/地区、业务类型、筛选、任务执行 | MultiSelect、ComboBox、DatePicker、Tag、Form、Button、ProgressIndicator | 高；字段组合与采集接口 |
| Discovery Tasks | 任务表、过滤、进度、日志、重试/取消 | DataTable、TableToolbar、Pagination、ProgressIndicator、InlineLoading、Modal | 高；任务状态与批量行为 |
| Discovery Results | 多渠道数据表、详情、联系信息、地图、批量动作 | DataTable、TableToolbar、OverflowMenu、Pagination、Tag、Tile/Modal | 高；字段异构、响应式列与操作 |
| Leads / CRM | 搜索筛选、DataTable、转化表单、Modal | DataTable、TableToolbarSearch、Dropdown/ComboBox、Modal、Form | 高；转化事务 |
| Master Data | 客户/企业/产品/商机表单与列表、上传 | DataTable、Form、FormGroup、TextInput、NumberInput、ComboBox、FileUploader、Modal | 高；复用多个 section |
| Orders | 订单列表、报价/销售/采购行编辑、金额、状态 | DataTable、NumberInput、Select、DatePicker、Tag、Modal、OverflowMenu | 高；金额/币种与行项目 |
| Documents | 单据编辑器、模板、预览、列表 | Form、DataTable、Tabs（仅既有二级分区）、Modal、FileUploader、InlineNotification | 高；动态单据字段和预览 |
| Integrations | ContentSwitcher、模型选项、密钥输入、连接测试 | ContentSwitcher（当前已有）、ComboBox、PasswordInput/TextInput、Button、InlineNotification、InlineLoading | 高；密钥与连接测试 |
| Search Exclusions | 规则编辑、多选、添加/删除 | MultiSelect、ComboBox、Tag、DataTable、Modal | 中高；选项溢出与规则保存 |
| Login | 登录表单、错误 | Form、TextInput、PasswordInput、Button、InlineNotification | 中；登录态不可变 |

## 5. 已确认的规范冲突与风险（基于代码读取）

### 高优先级全局冲突
1. Tailwind CSS v4 仍在 `globals.css`、页面 className 中广泛承担 layout、gap、padding、margin、宽度、字体和颜色。与“间距/布局/颜色只由 Carbon Grid 与 token 管理”冲突。
2. `design-tokens.css` 定义多组自建语义 CSS 变量，并带硬编码 hex fallback；与禁止硬编码色值、禁止自建主题变量冲突。
3. `reset.css` 手写 font-family、selection 色值、focus outline；与 Carbon 字体/颜色/焦点状态规范冲突。
4. `src/shared/ui/primitives.tsx` 虽然大量调用 Carbon 组件，但对外 API 仍暴露 default/outline/icon 等自定义变体，并通过空 label/hideLabel 适配旧控件；需区分“Carbon 原生组件”与“Carbon 外观薄封装”，逐项检查语义和无障碍。
5. `src/shared/ui/page-layout.tsx` 自建页面标题、breadcrumb、section；页面未被统一 Carbon Grid/Column 包裹，标题 token 使用不统一。
6. 页面组件仍普遍使用 Tailwind 类名构建自定义卡片、圆角、边框、字体、颜色和间距。AgentCenter、Integrations、Leads 页面抽样已发现 rounded、border、bg-muted、text-xs、font-semibold、p-4、gap 等 utility。
7. 当前多处表格已使用 Carbon Table 的基础元素，但不等于 Carbon DataTable、TableToolbar、Pagination、DataTableSkeleton 等数据表完整模式已经统一。
8. 页面中有自定义空状态（例如页面导入 Empty 图标/占位）和自定义加载/错误反馈，需要逐状态替换 Carbon 正式组件。
9. `sonner` Toaster/toast 仍作为全局通知方案，需评估并迁移为 Carbon ToastNotification / InlineNotification；必须保留原反馈触发语义。
10. `lucide-react` 仍在 package.json；需对全部页面逐文件盘点实际 import 与渲染，不可仅凭依赖存在就认定每页均使用。
11. `@carbon/react` 已使用，但 AppShell 仍将 Carbon SideNav 包在自定义 aside、移动端 dialog/backdrop 和自定义状态中；需要检查 Carbon UI Shell 官方组合与响应式行为。
12. Header 的 Search / Notification / User Global Actions 当前只看到 Carbon 图标操作入口；未核实其真实交互，不得作为已完成业务功能。

### 页面/控件风险
- AppShell：当前移动端断点监听使用 768px，而项目 Carbon 标准 md 为 672px；需统一断点并验证。
- AppShell：有自定义侧栏收起、遮罩、body overflow 管理，可能与 Carbon HeaderContainer/SideNav 内置交互重复。
- AgentCenter：同时有自定义布局 utility、动态状态、表单、协议配置、聊天/执行工作区；高风险。
- Integrations：已有 Carbon ContentSwitcher / Switch，但同页仍存在自定义 grid、rounded、border、字体类、图标图片 Logo 和多种表单适配。
- Leads：已用 Carbon Table 相关元素，但仍有自定义移动卡片、排序按钮、筛选布局和 Modal/表单；需统一 DataTable 模式。
- Discovery 页面：多渠道筛选项和结果字段不同，必须保留 channel-specific 字段结构，不能强制所有结果共用同一组列。
- Order / Document：业务编辑器复杂，先拆控件清单和行为契约，再做 Carbon 替换；不先做视觉“重写”。
- 地图画布：属于领域可视化，不是 Carbon 组件；地图周边工具栏、筛选、提示、图例等必须使用 Carbon。

## 6. 建议改造顺序

> 按阶段执行；以下仅为建议，实际每个阶段均需所有者确认。

1. **阶段 1 地基**：先完成 token / 字体 / Theme / Grid / UI Shell / Content / responsive breakpoints，清除自定义全局色值和字体来源；建立扫描规则。不要先从 Dashboard 或单页卡片开始。
2. **阶段 2 公共组件**：统一 PageHeader/Breadcrumb、Button、Icon action、FormField、Search/filter、Tag/status、DataTable 工具栏、Modal、Notification、Loading/Empty/Error；定义旧 API 到 Carbon 的兼容适配边界。
3. **阶段 3 页面顺序建议**：
   - 首批选一个结构相对清晰、能覆盖通用模式的设置页验证公共组件（建议 Search Exclusions 或 Integrations，需所有者确认）。
   - 然后 Agent Center（含 Agent 工作台/市场/接入/运行等子 section，按页面/section 单独验收）。
   - 再逐一迁移地图/搜索/Facebook/Instagram 发现页、任务中心、结果中心。
   - CRM Leads、Accounts、Contacts、Opportunities、企业/产品主数据。
   - Orders（报价、销售、采购）与 Documents（工作台、制作、管理、模板）。
   - Login、Agent Appearance 与全局剩余状态收尾。
4. **阶段 4 全局审查**：对所有路由、所有条件 UI、弹窗、抽屉、Popover、菜单、错误/空/加载态执行静态扫描、类型检查、测试、构建、无障碍与 320/390/672/1056/1312/1584 视口验证。
5. **发布**：每次仅一个页面完成后部署；线上检查对应页面；用户验收后再进入下一页。

## 7. 需要核对官方文档的 API / 规范项

1. `Section` / `Heading` 是否为 `@carbon/react@1.120.0` 正式组件导出；不可假定存在。
2. `Stack` 是否为当前版本正式导出及其 gap 单位；不可未经核对使用。
3. `IconButton` 是否为当前版本正式导出；若不是，采用 Carbon Button 的 icon-only 官方模式并核对 tooltip 组合。
4. `Grid narrow`、`Grid condensed` 是否为当前 CSS Grid API 支持的 prop（不要把 FlexGrid API 混用）。
5. `GlobalTheme` / `Theme` / `HeaderContainer` 的当前导出和 UI Shell 推荐组合。
6. 用户列出的 token 拼写（特别 border-subtle-01、border-strong-01、background-hover、text-placeholder、text-helper）是否全部为当前主题 token。
7. Sass `@use '@carbon/react/scss/spacing'`、theme、type、motion 的路径、namespace 与变量名是否在已安装版本中可用。
8. `@carbon/motion` 包是否需要额外依赖，以及 Carbon React 自带 motion tokens 的正式导入路径。
9. `DataTable` 与基础 Table 组件的适用场景、TableToolbar / DataTableSkeleton / Pagination API 与可访问性模式。
10. `ToastNotification` 的使用方式及是否有官方 toast 管理模式。

## 8. 阶段 0 自检

- [x] 已读取 develop 当前 HEAD 和完整文件树（166 个文件）。
- [x] 已识别 React / TypeScript / Vite、Carbon 版本与主要依赖。
- [x] 已从 App.tsx 提取路由映射并列出全部页面入口。
- [x] 已盘点 AppShell、共享 UI、样式入口和代表性复杂页面。
- [x] 已标出主要冲突、风险与迁移顺序。
- [ ] 全部页面的逐控件逐状态级 census：尚未完成，需在阶段 3 每页改造前逐页执行；本报告不把抽样扫描伪称为完整控件验收。
- [ ] 官方 API 待核对项：列于第 7 节，阶段 1 开始前逐项确认。

## 9. 等待所有者确认

1. 是否确认本报告作为阶段 0 基线，并允许进入阶段 1 地基？
2. 阶段 3 第一页是否按建议选“AI 与 API 集成”或“搜索排除规则”？建议先选搜索排除规则做轻量控件样板，或选集成页验证复杂表单与 ContentSwitcher；最终由所有者指定。
3. 是否继续保持当前 White 主题作为全站唯一主题？
4. Header 搜索、通知、用户操作如果目前无业务功能，是否保留为 disabled/隐藏，还是规划接入真实功能？这属于功能决策，未经确认不改变业务行为。
