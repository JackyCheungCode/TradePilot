# TradePilot 单据中心产品规格 v1.0

## 1. 产品定位

单据中心是 TradePilot 的独立一级业务模块，覆盖完整外贸业务：销售、采购、财务、装运出口和贸易证明。以业务主档案（Trade Master File）为核心，复用客户、供应商、产品、企业、银行、包装和运输资料，生成可追溯、可转换、可校验的贸易单据。

核心闭环：资料维护 → 业务主档案 → 单据生成 → 校验 → 人工确认 → 导出交付 → 版本归档。

## 2. 导航

- 单据工作台
- 业务档案：销售业务、采购业务、订单主档案
- 单据制作：报价与销售、采购、发票与财务、装运与出口、贸易证明
- 单据管理：全部单据、关联关系、版本记录、归档与分享
- 模板中心：系统模板、我的模板、模板编辑器、语言版本
- 业务资料库：企业、客户、供应商、产品、银行、包装、物流资料
- 单据设置：编号规则、币种、语言、默认条款、签名与印章

## 3. 第一版单据目录

### 销售
Quotation（报价单）、Proforma Invoice（形式发票）、Sales Contract（销售合同）、Sales Confirmation（销售确认书）。

### 采购
Request for Quotation（询价单）、Purchase Order（采购订单）、Purchase Confirmation（采购确认书）。

### 财务
Commercial Invoice（商业发票）、Tax Invoice（税务发票）、Credit Note（贷项通知单）、Debit Note（借项通知单）。

### 装运与出口
Packing List（装箱单）、Shipping Instructions（装运指示书）、Shipper's Letter of Instruction（托运人指示书）、VGM Declaration（集装箱核实总重声明）、Packing Declaration（包装声明）。

### 贸易证明
Certificate of Origin application data（原产地证申请资料）、Declaration of Origin（原产地声明）、Non-Asbestos Declaration（非石棉声明）、Bill of Exchange（汇票）。

官方或第三方签发文件必须标识签发主体。平台只生成草稿、申请资料或可供签发机构确认的文件，不伪造官方签发状态。

## 4. 业务主档案

一个业务主档案可关联多份单据。主档案至少包含：
- 买卖双方：法定名称、地址、国家/地区、联系人、税号、注册信息。
- 产品明细：SKU、品名、描述、规格、HS Code、原产国、数量、单位、单价。
- 交易条款：币种、价格、折扣、税费、付款方式、Incoterms 及版本、指定地点。
- 运输信息：运输方式、起运地/港、目的地/港、承运人、船名航次、柜号、提单号。
- 包装信息：包装类型、箱数、每箱数量、净重、毛重、尺寸、体积。
- 其他：业务编号、日期、交付日期、备注、附件、关联 CRM 客户/线索。

## 5. 单据工作流和状态

状态：draft、review、approved、issued、void、archived。转换必须生成新的单据记录并保留 source_document_id；不得覆盖来源单据。单据每次保存形成可追踪版本；已确认/已签发单据不得被主档案变更静默改写。导出文件绑定 document_id、version_id、template_version、locale、生成时间和内容快照。

## 6. 模板与国际化

- 系统模板可复制为用户模板；模板编辑与业务内容分离。
- 自定义 Logo、页眉页脚、版式、字段显隐、字段标签、字体、表格列、页码、签名/印章占位。
- 模板版本化；历史导出文件不随模板变更。
- 单据字段采用稳定的内部 key，显示标签由 locale 字典提供。
- 第一版采用可扩展 locale registry；初始内置英语、简体中文、繁体中文、西班牙语、法语、葡萄牙语、德语、意大利语、日语、韩语、阿拉伯语。支持 RTL 文本布局；各单据可指定内容语言，界面语言与单据语言分离。
- 日期、数字、金额、重量和尺寸格式按 locale 展示；金额计算以 decimal 精度规则处理，不用浮点数累计。

## 7. 校验规则

确定性规则优先，AI 只提供建议：
- 行金额 = 数量 × 单价 ± 明确折扣/费用；汇总金额与行项目一致。
- 发票与装箱单产品数量、品名、SKU 对照。
- 毛重不得小于净重；箱数、数量、尺寸、体积必须合理且单位明确。
- Incoterms 规则/版本/指定地点完整。
- 买卖双方主体信息在关联单据中一致。
- 必填字段按单据类型和交易场景配置。
错误、警告、待确认分级；校验结果记录规则版本和时间。AI 不作为官方合规认证。

## 8. 权限与审批

延续 TradePilot 单用户登录及 Worker 服务端访问模式。所有记录 owner-scoped；RLS 开启，前端不直连 service_role。草稿创建和编辑可自动保存；确认/签发、发送外部邮件、分享外部链接、作废、批量操作必须由用户明确确认。保留操作审计记录。

## 9. 数据模型建议

- trade_parties：买方、卖方、供应商、承运人等主体。
- trade_products：产品/SKU/HS Code。
- trade_orders：业务主档案。
- trade_order_items：业务产品明细。
- trade_documents：单据主表、类型、编号、状态、来源关系。
- trade_document_versions：版本快照。
- trade_document_templates：模板及模板版本。
- trade_document_files：PDF/附件元数据和存储路径。
- trade_document_events：审计事件。
- trade_document_number_sequences：按 owner、类型、年度的编号序列。
- trade_document_settings：默认币种、语言、条款、企业资料引用。

所有表使用 UUID、owner_id、created_at、updated_at；金额使用 numeric/decimal，单位显式存储，外键与 owner 一致性需由约束保证。文件存储私有 bucket，下载使用短时签名 URL。

## 10. API 边界

Worker API 统一前缀 /api/v1/trade：
- GET/POST /parties；GET/PATCH/DELETE /parties/:id
- GET/POST /products；GET/PATCH/DELETE /products/:id
- GET/POST /orders；GET/PATCH /orders/:id
- GET/POST /orders/:id/items
- GET/POST /documents；GET/PATCH /documents/:id
- POST /documents/:id/convert
- POST /documents/:id/validate
- GET /documents/:id/versions
- GET/POST /templates；POST /templates/:id/duplicate
- POST /documents/:id/export
所有查询必须校验 JWT、owner_id、关联对象归属及请求体 schema。

## 11. 分阶段交付

### Phase 1 — 平台基础
独立菜单与工作台、业务资料库基础、业务主档案、单据主表/版本/事件、编号服务、统一 API 权限与测试。

### Phase 2 — 核心销售/采购单据
报价单、PI、销售合同、采购订单、商业发票、装箱单；行项目计算、单据转换、版本快照。

### Phase 3 — 模板与 PDF
模板库、可视化模板编辑、国际化、PDF 预览/下载、私有文件存储、模板版本。

### Phase 4 — 完整出口与财务文件
其余运输、财务、贸易证明模板，规则校验、批量导出和单据包。

### Phase 5 — AI 与生态集成
小雅对话式制单、订单文件提取、AI 辅助检查、CRM/Agent 联动、外部 ERP/API。

## 12. 验收标准

- 同一业务档案可生成多种关联单据，转换不覆盖来源。
- owner 隔离和 RLS/API 权限测试通过。
- 数量、金额、重量计算有单元测试和边界测试。
- 版本快照可恢复，旧 PDF 不因模板或主档案更新而变化。
- 至少 10 种 locale 的标签/格式可用，RTL 模板有专门测试。
- PDF 导出可重现、可下载、文件权限受控。
- 外部发送/分享/签发类操作需要显式确认。
- CI、Worker 部署、登录态 API 验收和真实 PDF 验收分别报告，不互相替代。
