# TradePilot 主数据字段目录（SAP / Odoo 对照）

## 设计原则
- 客户/供应商采用统一业务伙伴（Business Partner）模型；客户、潜客、供应商、合作伙伴作为角色，不为每个角色复制同一主体。
- 资料分层：通用主数据、财务/付款资料、销售区域资料、采购组织资料、联系人、地址、银行账户。
- 本企业资料与往来单位资料分开；银行账户以独立子记录维护，支持多银行、多币种和默认账户。
- 产品主档案区分基本信息、销售/采购、计量单位、海关、重量尺寸、包装、批次/序列号和产品变体扩展。
- 单据制作读取 CRM 客户/联系人、企业抬头/银行、产品 SKU 的主数据快照；历史单据保留生成时的内容快照。
- 本目录是 TradePilot 面向跨境贸易的字段基线，不声称与 SAP S/4HANA 或 Odoo 全模块字段逐项等同；不同国家税务本地化、行业和公司组织结构可继续扩展 custom_fields。

## 参考依据
- SAP Business Partner 将通用数据、公司代码数据、销售区域数据和采购组织数据分层；通用数据包括名称、地址、电话、银行账户、税号和行业分类。公司代码层可维护付款条件等财务数据；销售区域由销售组织、分销渠道、产品事业部构成，并维护币种、税分类、交货等信息。
- Odoo 联系人支持公司/个人、地址类型、职位、税号、合作伙伴级别、网站、语言以及多个联系人和发票/交货/跟进地址。
- Odoo 公司资料包括公司名称、地址、Tax ID、LEI、Company ID、币种、电话、手机、邮箱、网站和 Logo；产品支持商品/服务、销售采购、变体、属性和计量单位转换。
- SAP 和 Odoo 的字段会受版本、公司组织配置和国家税务本地化影响，TradePilot 采用跨境贸易共通字段，并保留扩展字段。

## CRM 客户 / 往来单位
### 基本身份
- account_number、partner_ref、account_name、legal_name、company_type、account_type、status、parent_account_id
- customer_rank、supplier_rank、industry、industry_code、legal_form、company_size（后续扩展）
- registration_number、tax_number、vat_number、duns_number、country_code

### 通信与地址
- website、email、invoice_email、remittance_email、phone、fax
- country_code、region、city、billing_address、shipping_address
- language_code、timezone、联系人与地址子记录

### 销售、采购与财务条件
- currency_code、payment_terms、payment_method、credit_limit、credit_days、credit_status
- incoterms_code、incoterms_version、shipping_terms、delivery_method
- price_list、fiscal_position、tax_classification、tax_exemption_code、billing_cycle、dunning_procedure
- sales_region、sales_team、account_manager、source_lead_id、notes、custom_fields

### 组织层级扩展
- SAP company code / sales area / purchasing organization 的数据在不同组织层级可能不同。当前版本已保留 company_code、sales_organization、distribution_channel、division、purchasing_organization 字段基线；下一轮应把重复组织字段拆成一对多的组织视图，而不是覆盖客户通用信息。

## 联系人
- account_id、salutation、first_name、middle_name、last_name、suffix、full_name
- title、job_title、department、contact_role、decision_role
- email、phone、phone_extension、mobile、whatsapp、linkedin_url
- preferred_channel、preferred_language、timezone、contact_type
- is_primary、is_active、do_not_contact、notes、custom_fields

## 商机
- opportunity_number、account_id、primary_contact_id、name
- stage、status、amount、currency_code、probability、expected_close_date
- source、lead_source_detail、campaign、competitor
- sales_team、sales_person、forecast_category、next_step、next_activity_date
- description、lost_reason

## 本企业资料
- legal_name、trade_name、short_name、former_names、legal_form
- registration_number、tax_number、vat_number、eori_number、duns_number、lei_number
- country_code、registration_country、registration_authority、established_on、business_status
- registered_address、headquarters_address、mailing_address
- industry、business_scope、website、email、phone、fax、contact_name、contact_title
- company_code、sales_organization、distribution_channel、division、purchasing_organization
- default_currency、default_payment_terms、default_incoterms
- company_size、employee_count、annual_revenue、registered_capital、stock_exchange、fiscal_year_end
- export_license_number、customs_registration_number、logo_url、is_default、notes、custom_fields

## 银行账户（可多条）
- enterprise_id、bank_name、bank_branch、account_name、account_number
- iban、swift_bic、routing_number、sort_code、bank_code、branch_code
- currency_code、country_code、bank_address、intermediary_bank
- is_default、is_active、notes

## 产品 / 物料
### 基本与识别
- name、sku、barcode、category、brand、model_number、manufacturer
- material_type、product_group、product_family、description、specifications、product_images

### 销售 / 采购与计量
- unit、base_unit、purchase_unit、sales_unit、alternative_units（含换算比例）
- default_currency、default_unit_price、cost_price、moq、lead_time_days、warranty_period

### 海关 / 物流 / 合规
- hs_code、customs_description、origin_country_code、country_of_origin、tax_category
- net_weight、gross_weight、weight_unit、volume、volume_unit、dimensions、packaging
- serial_tracking、batch_tracking、shelf_life_days

## 单据引用原则
- 销售单据：读取默认本企业抬头、客户、联系人、商机、客户账单/收货地址、付款条件、贸易术语、客户税务标识。
- 采购单据：读取本企业采购主体、供应商、供应商联系人、供应商付款和交货条件。
- 商业发票：读取企业注册/税务资料、客户开票资料、银行账户、币种、产品 HS Code、原产国、数量、单位、价格、折扣、税额。
- 装箱单：读取 SKU、描述、数量、包装、箱数、净重、毛重、尺寸和体积。
- 每份单据生成时保存主数据快照；主数据后续更新不回写已经生成的单据。

## 当前实现边界
- 已落库并启用 RLS：crm_accounts、crm_contacts、crm_opportunities、enterprise_profiles、enterprise_bank_accounts。
- 已扩展 trade_products 的产品/物料字段；trade_orders 可关联 CRM 客户、联系人、商机和本企业。
- 单据创建时读取并快照相关客户、联系人、本企业和银行账户资料。
- 当前 UI 提供主数据录入、列表、编辑/停用基础能力；更复杂的 SAP 组织级销售区域/公司代码/采购组织一对多子表、客户信用审批、产品多变体矩阵、税务本地化规则和会计科目仍属于后续阶段，不应视为已完成。
