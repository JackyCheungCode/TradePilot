# Carbon 公共 UI 旧实现隔离规则

本文件是 `docs/CARBON_V11_RULES.md` 的执行补充，适用于阶段 2 及后续页面迁移。

## 已确认决策

- 表单选择控件使用 Carbon 官方 `Select`，接受其底层原生 select 交互。
- 不使用浏览器原生控件自行绘制样式，也不以自制菜单替代 Carbon 组件。
- 公共组件只组合和透传 `@carbon/react` 官方组件，不创建第二套视觉系统。

## 公共组件目录的硬性限制

`src/components/common/**` 不得：

- 导入旧的 `@/shared/ui/*` 封装；
- 导入 `cn`、`clsx`、`tailwind-merge` 等 Tailwind 类名拼接工具；
- 使用 Tailwind utility class 实现布局、尺寸、颜色、间距、边框、圆角或阴影；
- 通过空 label、hideLabel 等方式掩盖缺失的可访问名称；
- 自行定义 Carbon 控件的视觉样式。

上述限制已加入 ESLint，作为后续新增公共组件的自动检查门槛。

## 旧代码清理策略

旧 UI 文件仍可能被既有页面调用，不能在未完成引用迁移前直接删除。清理按以下顺序执行：

1. 公共组件不再依赖旧封装，并由 ESLint 阻止重新引入。
2. 逐页面替换旧 `PageControlPanel`、`FormField`、`FormLayout`、旧 Button/Input/Badge 等兼容封装。
3. 每个页面替换后检查交互、无障碍、响应式、构建和视觉回归。
4. 全部调用迁移完成后，删除旧 `src/shared/ui/**` 封装及相关 CSS。
5. 最后移除 Tailwind Vite 插件、Tailwind 依赖、类名合并工具和 Tailwind 专用 CSS。

## 不得提前删除的内容

当前页面仍有 Tailwind utility class 使用，因此不能在页面迁移完成前删除 Tailwind 编译插件或 utilities 样式，否则会造成已部署页面布局失效。依赖保留只是迁移期间的兼容措施，不代表它是后续设计系统的可选方案。

## 验收要求

- 新公共组件目录 ESLint 不允许 Tailwind utility class 和旧封装依赖。
- 新页面不得导入旧 UI 封装。
- 旧文件只有在全仓库引用数为零时才允许删除。
- 移除 Tailwind 前，必须通过全仓库搜索确认无 utility class、无 Tailwind 指令、无插件引用，并通过 typecheck、test、lint、build。
