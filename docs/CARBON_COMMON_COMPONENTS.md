# TradePilot Carbon 公共组件 API

> 阶段 2 实施基线。所有控件本体来自 @carbon/react@1.120.0。封装层只组合、设置经确认的默认值并透传 Carbon props，不重绘控件样式。API 请求、业务状态、提交校验和分页查询由页面负责。

## PageHeader

基础组件：Breadcrumb、BreadcrumbItem、Section、Heading、Stack。

| Prop | 默认值 | 说明 |
|---|---|---|
| breadcrumbs | [] | 面包屑数组，元素为 { label, href? }；最后一项自动标记当前页面 |
| title | 必填 | 页面标题；Section level=1 使 Heading 语义为 h1，使用 productive-heading-04 |
| actions | undefined | 页面级操作区 ReactNode |

使用示例：

    <PageHeader
      breadcrumbs={[{ label: "潜客发现", href: "/lead-discovery" }, { label: "搜索结果" }]}
      title="搜索结果"
      actions={<ActionButtons primary={{ label: "创建任务", onClick: createTask }} />}
    />

## ActionButtons

基础组件：ButtonSet、Button。次要按钮在左，唯一 Primary 在右。

| Prop | 默认值 | 说明 |
|---|---|---|
| primary | undefined | 唯一主操作，{ label, onClick?, disabled? } |
| secondary | [] | 次要操作数组 |
| size | Carbon 默认 | 透传给 Carbon Button |

次要按钮 kind 默认 secondary，可用 Carbon secondary、tertiary、ghost、danger、danger--tertiary、danger--ghost。主操作固定为 primary。

使用示例：

    <ActionButtons
      secondary={[{ label: "取消", onClick: onCancel }, { label: "导出", onClick: onExport }]}
      primary={{ label: "保存", onClick: onSave }}
    />

## ConfirmModal

基础组件：Modal、Stack。

| Prop | 默认值 | 说明 |
|---|---|---|
| open | 必填 | 显示状态 |
| onClose | 必填 | 关闭回调 |
| onConfirm | 必填 | 确认回调 |
| title | 必填 | 弹窗标题 |
| objectName | 必填 | 明确展示操作对象 |
| description | undefined | 补充说明 |
| danger | false | Carbon danger 模式，并明确提示“此操作不可撤销” |
| confirmText | 确认 | 主按钮文字 |
| cancelText | 取消 | 次按钮文字 |
| loading | false | 禁用主按钮，避免重复提交 |

使用示例：

    <ConfirmModal open={open} onClose={close} onConfirm={removeRecord}
      title="删除潜在客户" objectName="Acme Corporation" danger />

## FormField：TextInput、Select、NumberInput

三个控件共用属性：id（必填）、labelText（必填）、helperText（默认 undefined）、invalid（默认 false）、invalidText（默认 undefined）。其他受支持属性透传给对应 Carbon 组件。

- TextInput：Carbon TextInput。
- Select：Carbon Select + SelectItem。items 必填，元素为 { value, text, disabled? }；placeholder 默认“请选择”。
- NumberInput：Carbon NumberInput。labelText 映射到 Carbon 的 label；onChange 保留 Carbon 的 (event, state) 回调签名。

使用示例：

    <TextInput id="company" labelText="企业名称" value={name} onChange={onNameChange}
      helperText="填写企业注册名称" />
    <Select id="industry" labelText="所属行业" value={industry} onChange={onIndustryChange}
      items={[{ value: "3c", text: "消费电子" }]} />
    <NumberInput id="employees" labelText="员工人数" min={0} step={1}
      value={employeeCount} onChange={onEmployeeCountChange} />

## FormLayout、FormGroup

基础组件：Grid、Column、Stack。

| 组件 | Prop | 默认值 | 说明 |
|---|---|---|---|
| FormLayout | children | 必填 | 表单限制为 8 列；sm 4 列、md 8 列、lg 及以上 8 列 |
| FormGroup | children | 必填 | 字段间距 Carbon Stack gap 6 |

FormLayout 的分组间距为 Carbon Stack gap 7。数值代表 Carbon spacing scale step，不是自定义 CSS 像素值。

使用示例：

    <FormLayout>
      <FormGroup><TextInput {...nameProps} /><Select {...industryProps} /></FormGroup>
      <FormGroup><NumberInput {...sizeProps} /></FormGroup>
    </FormLayout>

## DataTablePage

基础组件：Carbon DataTable（由调用方传入）、Pagination、Stack。

| Prop | 默认值 | 说明 |
|---|---|---|
| toolbar | undefined | Carbon TableToolbar、搜索、筛选和批量操作区域 |
| dataTable | 必填 | Carbon DataTable React element |
| pagination | undefined | Carbon Pagination props；提供后渲染分页 |
| rowSize | md | sm、md、lg，透传至 Carbon DataTable 的 size 属性 |

使用示例：

    <DataTablePage toolbar={<ProspectTableToolbar />}
      dataTable={<ProspectDataTable rows={rows} headers={headers} />}
      pagination={paginationProps} rowSize="md" />

## 状态组件

### TableLoading

基础组件：DataTableSkeleton。

| Prop | 默认值 | 说明 |
|---|---|---|
| columnCount | 5 | 骨架列数 |
| rowCount | 5 | 骨架行数 |
| showHeader | true | 是否显示表头 |
| size | md | Carbon 表格尺寸 |

示例： <TableLoading columnCount={6} rowCount={8} />

### EmptyState

基础组件：Tile、Stack、Section、Heading。

| Prop | 默认值 | 说明 |
|---|---|---|
| title | 暂无数据 | 空状态标题 |
| description | undefined | 说明文字 |

示例： <EmptyState title="暂无搜索结果" description="调整筛选条件后重新搜索。" />

### ErrorState

基础组件：InlineNotification、Button、Stack。

| Prop | 默认值 | 说明 |
|---|---|---|
| title | 加载失败 | 错误标题 |
| message | undefined | 错误说明 |
| onRetry | undefined | 重试回调 |
| retryText | 重试 | 重试按钮文字 |

示例： <ErrorState title="数据加载失败" message="请稍后重试。" onRetry={reload} />

## Notify

- Notify.toast({ kind, title, subtitle?, timeout? })：Carbon ToastNotification；timeout 默认 5000 毫秒。
- Notify.inline({ kind, title, subtitle? })：返回 Carbon InlineNotification React 节点，由调用方放在相关内容附近。
- kind 允许 success、info、warning、error。
- NotifyViewport 已挂载在 App 登录态和应用态根内容中。Toast 仅用于短暂、非交互反馈；需要用户操作的通知使用页面内控件。

使用示例：

    Notify.toast({ kind: "success", title: "保存成功", subtitle: "企业资料已更新" });
    return <>{Notify.inline({ kind: "error", title: "加载失败", subtitle: "请重试" })}</>;

## 数据格式工具

| 函数 | 默认值与规则 |
|---|---|
| formatDate(value) | 输出 YYYY-MM-DD；空值或无效日期显示 —；日期型字符串不经时区转换 |
| formatNumber(value, locale?) | locale 默认 en-US；千分位；空值和非有限数字显示 — |
| formatMoney(value, currency, fractionDigits?, locale?) | 小数位默认 2，locale 默认 en-US；固定小数位；币种代码必填 |
| formatValue(value) | null、undefined、空字符串、NaN 显示 —；数值 0 保留 |

使用示例：

    formatDate("2026-11-15");
    formatNumber(1234567);
    formatMoney(1234.5, "USD", 2);
    formatValue(null);

## 实施边界

- 不发起 API 请求、不管理业务状态、不擅自改变业务校验规则。
- FormField 只映射 Carbon 原生 invalid 和 invalidText；校验结果由调用方提供。
- DataTablePage 不实现排序、筛选或分页请求；这些行为由调用方和 Carbon DataTable / Pagination 负责。
- 旧 src/shared/ui 封装暂不替换，不批量迁移业务页面；兼容性在阶段 3 逐页处理。
