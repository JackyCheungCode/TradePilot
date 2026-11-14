import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, CheckCircle2, ClipboardList, FileText, Pencil, RefreshCw, Search, ShoppingCart, Truck } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Combobox } from "@/shared/ui/primitives";
import { tradeApi, type TradeDocument, type TradeOrder } from "@/features/document-center/infrastructure/trade-api";

type View = "all" | "quotations" | "sales" | "purchase";
const statusLabels: Record<string, string> = { draft: "草稿", review: "待审核", approved: "已批准", issued: "已发出", active: "执行中", completed: "已完成", cancelled: "已取消", void: "已作废", archived: "已归档" };
const typeLabels: Record<string, string> = { quotation: "销售报价单", request_for_quotation: "采购询价单" };
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString() : "—";
const amountFor = (order: TradeOrder) => (order.trade_order_items ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0) * (1 + Number(item.tax_rate ?? 0) / 100), 0);
const money = (value: number, currency: string) => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value); }
  catch { return currency + " " + value.toFixed(2); }
};

export function OrderCenterPage({ onCreateQuotation, initialView = "quotations" }: { onCreateQuotation: () => void; initialView?: Exclude<View, "all"> }) {
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [documents, setDocuments] = useState<TradeDocument[]>([]);
  const [view, setView] = useState<View>(initialView);
  useEffect(() => { setView(initialView); }, [initialView]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "order_number" | "title" | "account" | "amount">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [listPage, setListPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [editingOrderId, setEditingOrderId] = useState("");
  const [orderDraft, setOrderDraft] = useState({
    title: "", customer_reference: "", trade_date: "", validity_date: "", delivery_date: "",
    payment_terms: "", pricelist_name: "", fiscal_position: "", incoterms_code: "", incoterms_version: "2020", named_place: "",
    shipping_policy: "asap", origin_location: "", destination_location: "", salesperson_name: "", sales_team: "",
    source_document: "", campaign: "", medium: "", source: "", signature_required: false, payment_required: false, prepayment_percent: "",
    invoice_street: "", invoice_city: "", invoice_state: "", invoice_zip: "", invoice_country: "",
    delivery_street: "", delivery_city: "", delivery_state: "", delivery_zip: "", delivery_country: "",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRows, documentRows] = await Promise.all([tradeApi.listOrders(), tradeApi.listDocuments()]);
      setOrders(orderRows);
      setDocuments(documentRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "订单中心加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const quotations = useMemo(() => documents.filter((item) => ["quotation", "request_for_quotation"].includes(item.document_type)), [documents]);
  const filteredOrders = useMemo(() => orders.filter((order) => {
    if (view === "sales" && order.order_type !== "sales") return false;
    if (view === "purchase" && order.order_type !== "purchase") return false;
    const account = order.crm_account?.account_name ?? "";
    return (!statusFilter || order.status === statusFilter) && (order.order_number + " " + order.title + " " + account).toLowerCase().includes(search.toLowerCase());
  }).sort((a,b) => { const av = sortBy === "amount" ? amountFor(a) : sortBy === "created_at" ? new Date(a.created_at).getTime() : sortBy === "account" ? (a.crm_account?.account_name ?? "") : sortBy === "order_number" ? a.order_number : a.title; const bv = sortBy === "amount" ? amountFor(b) : sortBy === "created_at" ? new Date(b.created_at).getTime() : sortBy === "account" ? (b.crm_account?.account_name ?? "") : sortBy === "order_number" ? b.order_number : b.title; const diff = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }); return sortDirection === "asc" ? diff : -diff; }), [orders, view, search, statusFilter, sortBy, sortDirection]);
  const filteredQuotes = useMemo(() => quotations.filter((item) => {
    const related = item.trade_orders?.order_number ?? "";
    return (!statusFilter || item.status === statusFilter) && (item.document_number + " " + item.title + " " + related).toLowerCase().includes(search.toLowerCase());
  }).sort((a,b) => { const av = sortBy === "created_at" ? new Date(a.created_at).getTime() : sortBy === "order_number" ? a.document_number : a.title; const bv = sortBy === "created_at" ? new Date(b.created_at).getTime() : sortBy === "order_number" ? b.document_number : b.title; const diff = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }); return sortDirection === "asc" ? diff : -diff; }), [quotations, search, statusFilter, sortBy, sortDirection]);
  

  const pageSize = 20;
  const currentRows = view === "quotations" ? filteredQuotes : filteredOrders;
  const pageCount = Math.max(1, Math.ceil(currentRows.length / pageSize));
  const pagedOrders = useMemo(() => filteredOrders.slice((listPage - 1) * pageSize, listPage * pageSize), [filteredOrders, listPage]);
  const pagedQuotes = useMemo(() => filteredQuotes.slice((listPage - 1) * pageSize, listPage * pageSize), [filteredQuotes, listPage]);
  useEffect(() => { setListPage(1); setSelectedOrderIds([]); }, [view, search, statusFilter, sortBy, sortDirection]);
  const toggleSort = (key: typeof sortBy) => { if (sortBy === key) setSortDirection((value) => value === "asc" ? "desc" : "asc"); else { setSortBy(key); setSortDirection(key === "created_at" ? "desc" : "asc"); } };
  const sortLabel = (key: typeof sortBy, label: string) => <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground">{label}{sortBy === key ? (sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}</button>;
  const handleBulkStatus = async (status: "completed" | "cancelled") => { const selected = orders.filter((order) => selectedOrderIds.includes(order.id)); if (!selected.length) return; setBusyId("bulk"); try { await Promise.all(selected.map((order) => tradeApi.updateOrder(order.id, { status }))); toast.success(`已批量${status === "completed" ? "完成" : "取消"} ${selected.length} 条订单`); setSelectedOrderIds([]); await refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "批量更新失败，请检查订单状态"); } finally { setBusyId(""); } };

  const beginEditOrder = (order: TradeOrder) => {
    const invoice = order.invoice_address && Object.keys(order.invoice_address).length ? order.invoice_address : order.crm_account?.billing_address ?? {}; const delivery = order.delivery_address && Object.keys(order.delivery_address).length ? order.delivery_address : order.crm_account?.shipping_address ?? {};
    setEditingOrderId(order.id);
    setOrderDraft({
      title: order.title ?? "", customer_reference: order.customer_reference ?? "", trade_date: order.trade_date ?? "",
      validity_date: order.validity_date ?? "", delivery_date: order.delivery_date ?? "", payment_terms: order.payment_terms ?? "",
      pricelist_name: order.pricelist_name ?? "", fiscal_position: order.fiscal_position ?? "", incoterms_code: order.incoterms_code ?? "",
      incoterms_version: order.incoterms_version ?? "2020", named_place: order.named_place ?? "", shipping_policy: order.shipping_policy ?? "asap",
      origin_location: order.origin_location ?? "", destination_location: order.destination_location ?? "", salesperson_name: order.salesperson_name ?? "",
      sales_team: order.sales_team ?? "", source_document: order.source_document ?? "", campaign: order.campaign ?? "", medium: order.medium ?? "",
      source: order.source ?? "", signature_required: Boolean(order.signature_required), payment_required: Boolean(order.payment_required),
      prepayment_percent: order.prepayment_percent == null ? "" : String(order.prepayment_percent),
      invoice_street: String(invoice.street ?? invoice.address_line1 ?? ""), invoice_city: String(invoice.city ?? ""),
      invoice_state: String(invoice.state ?? ""), invoice_zip: String(invoice.zip ?? invoice.postal_code ?? ""), invoice_country: String(invoice.country ?? ""),
      delivery_street: String(delivery.street ?? delivery.address_line1 ?? ""), delivery_city: String(delivery.city ?? ""),
      delivery_state: String(delivery.state ?? ""), delivery_zip: String(delivery.zip ?? delivery.postal_code ?? ""), delivery_country: String(delivery.country ?? ""),
    });
  };

  const saveOrderDetails = async () => {
    const order = orders.find((item) => item.id === editingOrderId);
    if (!order) return;
    if (orderDraft.prepayment_percent && (!Number.isFinite(Number(orderDraft.prepayment_percent)) || Number(orderDraft.prepayment_percent) < 0 || Number(orderDraft.prepayment_percent) > 100)) {
      toast.error("预付款比例必须在 0 到 100 之间"); return;
    }
    setBusyId(order.id);
    try {
      await tradeApi.updateOrder(order.id, {
        title: orderDraft.title.trim(), customer_reference: orderDraft.customer_reference.trim(),
        trade_date: orderDraft.trade_date || null, validity_date: orderDraft.validity_date || null, delivery_date: orderDraft.delivery_date || null,
        payment_terms: orderDraft.payment_terms, pricelist_name: orderDraft.pricelist_name, fiscal_position: orderDraft.fiscal_position,
        incoterms_code: orderDraft.incoterms_code.toUpperCase(), incoterms_version: orderDraft.incoterms_version, named_place: orderDraft.named_place,
        shipping_policy: orderDraft.shipping_policy, origin_location: orderDraft.origin_location, destination_location: orderDraft.destination_location,
        salesperson_name: orderDraft.salesperson_name, sales_team: orderDraft.sales_team, source_document: orderDraft.source_document,
        campaign: orderDraft.campaign, medium: orderDraft.medium, source: orderDraft.source,
        signature_required: orderDraft.signature_required, payment_required: orderDraft.payment_required,
        prepayment_percent: orderDraft.prepayment_percent ? Number(orderDraft.prepayment_percent) : null,
        invoice_address: { street: orderDraft.invoice_street, city: orderDraft.invoice_city, state: orderDraft.invoice_state, zip: orderDraft.invoice_zip, country: orderDraft.invoice_country },
        delivery_address: { street: orderDraft.delivery_street, city: orderDraft.delivery_city, state: orderDraft.delivery_state, zip: orderDraft.delivery_zip, country: orderDraft.delivery_country },
      });
      toast.success("订单业务资料已保存");
      setEditingOrderId("");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "订单资料保存失败"); }
    finally { setBusyId(""); }
  };

  const confirmQuote = async (quote: TradeDocument) => {
    setBusyId(quote.id);
    try {
      await tradeApi.confirmQuotation(quote.id);
      toast.success("报价单已确认，关联订单已转为执行中");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "报价单确认失败");
    } finally {
      setBusyId("");
    }
  };

  const changeOrderStatus = async (order: TradeOrder, status: "active" | "completed" | "cancelled") => {
    setBusyId(order.id);
    try {
      await tradeApi.updateOrder(order.id, { status });
      toast.success(status === "active" ? "订单已开始执行" : status === "completed" ? "订单已完成" : "订单已取消");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "订单状态更新失败");
    } finally {
      setBusyId("");
    }
  };

  const counts = {
    quotes: quotations.length,
    sales: orders.filter((item) => item.order_type === "sales").length,
    purchase: orders.filter((item) => item.order_type === "purchase").length,
    active: orders.filter((item) => item.status === "active").length,
  };

  return <div className="space-y-5 p-3 sm:p-4 lg:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-muted-foreground" /><h1 className="text-2xl font-semibold tracking-tight">{view === "quotations" ? "报价与询价" : view === "sales" ? "销售业务" : "采购业务"}</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">{view === "quotations" ? "集中管理销售报价与采购询价，跟踪确认状态及关联业务单据。" : view === "sales" ? "管理销售订单、客户交付条件与订单履约进度。" : "管理采购订单、供应商交付条件与采购执行进度。"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={"mr-2 h-4 w-4 " + (loading ? "animate-spin" : "")} />刷新</Button>
        <Button onClick={onCreateQuotation}><FileText className="mr-2 h-4 w-4" />新建报价 / 业务单据</Button>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: "报价与询价", value: counts.quotes, icon: FileText }, { label: "销售订单", value: counts.sales, icon: ShoppingCart }, { label: "采购订单", value: counts.purchase, icon: Truck }, { label: "执行中订单", value: counts.active, icon: CheckCircle2 }].map((item) => <Card key={item.label}><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{loading ? "—" : item.value}</p></div><item.icon className="h-5 w-5 text-muted-foreground" /></CardContent></Card>)}
    </div>

    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><CardTitle>业务单据</CardTitle><CardDescription>报价单确认后会同步激活其关联订单；历史版本与模板快照保留在单据中心。</CardDescription></div>
          <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索编号、名称或客户" /></div>
          <div className="flex flex-wrap items-center gap-2">
            <Combobox value={statusFilter} onValueChange={setStatusFilter} placeholder="全部状态" options={[{value:"",label:"全部状态"},...Object.entries(statusLabels).map(([value,label])=>({value,label}))]}/>
            <span className="text-xs text-muted-foreground">点击表头可排序</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {view !== "quotations" && <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">{view === "sales" ? "销售订单" : "采购订单"}</h2><span className="text-xs text-muted-foreground">{filteredOrders.length} 条</span></div>
          {pagedOrders.length > 0 && <div className="overflow-x-auto rounded-lg bg-background"><table className="w-full min-w-[1050px] text-sm"><thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground"><tr className="border-b text-left"><th className="w-10 p-3"><input type="checkbox" aria-label="全选当前页订单" checked={pagedOrders.length > 0 && pagedOrders.every((order) => selectedOrderIds.includes(order.id))} onChange={(event) => setSelectedOrderIds((current) => event.target.checked ? Array.from(new Set([...current, ...pagedOrders.map((order) => order.id)])) : current.filter((id) => !pagedOrders.some((order) => order.id === id)))} /></th><th className="p-3">{sortLabel("order_number", "订单编号")}</th><th className="p-3">{sortLabel("title", "订单名称")}</th><th className="p-3">{sortLabel("account", "客户 / 供应商")}</th><th className="p-3">{sortLabel("amount", "订单金额")}</th><th className="p-3">付款 / 贸易条件</th><th className="p-3">{sortLabel("created_at", "创建时间")}</th><th className="p-3">状态</th><th className="p-3 text-right">操作</th></tr></thead><tbody>{pagedOrders.map((order) => <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30"><td className="p-3"><input type="checkbox" aria-label={`选择订单 ${order.order_number}`} checked={selectedOrderIds.includes(order.id)} onChange={(event) => setSelectedOrderIds((current) => event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id))} /></td><td className="whitespace-nowrap p-3 font-medium tabular-nums">{order.order_number}</td><td className="max-w-[220px] p-3"><span className="block truncate font-medium">{order.title}</span><span className="text-xs text-muted-foreground">{(order.trade_order_items ?? []).length} 个产品行</span></td><td className="p-3">{order.crm_account?.account_name ?? "未关联客户"}</td><td className="whitespace-nowrap p-3 text-right font-medium tabular-nums">{money(amountFor(order), order.currency_code)}</td><td className="max-w-[200px] p-3 text-xs text-muted-foreground">{[order.payment_terms, order.incoterms_code && (order.incoterms_code + (order.named_place ? " · " + order.named_place : "")), order.delivery_date && ("交货 " + dateLabel(order.delivery_date))].filter(Boolean).join(" / ") || "—"}</td><td className="whitespace-nowrap p-3 text-xs tabular-nums text-muted-foreground">{dateLabel(order.created_at)}</td><td className="p-3"><Badge variant={order.status === "active" ? "success" : "secondary"}>{statusLabels[order.status] ?? order.status}</Badge></td><td className="p-3"><div className="flex justify-end gap-1">{order.status === "draft" && <Button size="sm" onClick={() => void changeOrderStatus(order, "active")} disabled={busyId === order.id}>开始执行</Button>}{order.status === "active" && <><Button size="sm" variant="outline" onClick={() => void changeOrderStatus(order, "completed")} disabled={busyId === order.id}>完成</Button><Button size="sm" variant="ghost" onClick={() => void changeOrderStatus(order, "cancelled")} disabled={busyId === order.id}>取消</Button></>}<Button size="sm" variant="outline" onClick={() => beginEditOrder(order)}><Pencil className="mr-1 h-3.5 w-3.5" />编辑</Button><Button size="sm" variant="ghost" onClick={onCreateQuotation}>制作单据 <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Button></div></td></tr>)}</tbody></table></div>}{selectedOrderIds.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2"><p className="text-sm">已选择 {selectedOrderIds.length} 条订单</p><div className="flex gap-2">{selectedOrderIds.every((id) => orders.find((order) => order.id === id)?.status === "active") && <Button size="sm" onClick={() => void handleBulkStatus("completed")} disabled={busyId === "bulk"}>批量标记完成</Button>}<Button size="sm" variant="outline" onClick={() => void handleBulkStatus("cancelled")} disabled={busyId === "bulk"}>批量取消</Button><Button size="sm" variant="ghost" onClick={() => setSelectedOrderIds([])}>清除选择</Button></div></div>}{editingOrderId && orders.filter((order) => order.id === editingOrderId).map((order) => <Fragment key={order.id}>{editingOrderId === order.id && <div className="mt-4 space-y-4 border-t pt-4">
              <div><p className="font-medium">订单资料</p><p className="text-xs text-muted-foreground">按 Odoo 销售订单字段分组维护；地址、付款、交付与来源信息会保存到业务档案。</p></div>
              <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">订单与报价信息</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Input value={orderDraft.title} onChange={(e) => setOrderDraft((d) => ({ ...d, title: e.target.value }))} placeholder="订单名称" />
                <Input value={orderDraft.customer_reference} onChange={(e) => setOrderDraft((d) => ({ ...d, customer_reference: e.target.value }))} placeholder="客户参考号" />
                <Input type="date" value={orderDraft.trade_date} onChange={(e) => setOrderDraft((d) => ({ ...d, trade_date: e.target.value }))} />
                <Input type="date" value={orderDraft.validity_date} onChange={(e) => setOrderDraft((d) => ({ ...d, validity_date: e.target.value }))} />
              </div></div>
              <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">开票地址</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {(["invoice_street","invoice_city","invoice_state","invoice_zip","invoice_country"] as const).map((key) => <Input key={key} value={orderDraft[key]} onChange={(e) => setOrderDraft((d) => ({ ...d, [key]: e.target.value }))} placeholder={({invoice_street:"街道地址",invoice_city:"城市",invoice_state:"州 / 省",invoice_zip:"邮编",invoice_country:"国家"} as Record<string,string>)[key]} />)}
              </div></div>
              <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">交付地址</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {(["delivery_street","delivery_city","delivery_state","delivery_zip","delivery_country"] as const).map((key) => <Input key={key} value={orderDraft[key]} onChange={(e) => setOrderDraft((d) => ({ ...d, [key]: e.target.value }))} placeholder={({delivery_street:"街道地址",delivery_city:"城市",delivery_state:"州 / 省",delivery_zip:"邮编",delivery_country:"国家"} as Record<string,string>)[key]} />)}
              </div></div>
              <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">销售、付款与税务</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Input value={orderDraft.payment_terms} onChange={(e) => setOrderDraft((d) => ({ ...d, payment_terms: e.target.value }))} placeholder="付款条件，如 T/T 30% deposit" />
                <Input value={orderDraft.pricelist_name} onChange={(e) => setOrderDraft((d) => ({ ...d, pricelist_name: e.target.value }))} placeholder="价格表" />
                <Input value={orderDraft.fiscal_position} onChange={(e) => setOrderDraft((d) => ({ ...d, fiscal_position: e.target.value }))} placeholder="税务位置 / 税务规则" />
                <Input value={orderDraft.prepayment_percent} onChange={(e) => setOrderDraft((d) => ({ ...d, prepayment_percent: e.target.value }))} placeholder="预付款比例 %" />
                <Input value={orderDraft.salesperson_name} onChange={(e) => setOrderDraft((d) => ({ ...d, salesperson_name: e.target.value }))} placeholder="销售负责人" />
                <Input value={orderDraft.sales_team} onChange={(e) => setOrderDraft((d) => ({ ...d, sales_team: e.target.value }))} placeholder="销售团队" />
              </div><div className="flex flex-wrap gap-2"><Button size="sm" variant={orderDraft.signature_required ? "default" : "outline"} onClick={() => setOrderDraft((d) => ({ ...d, signature_required: !d.signature_required }))}>要求客户签署：{orderDraft.signature_required ? "是" : "否"}</Button><Button size="sm" variant={orderDraft.payment_required ? "default" : "outline"} onClick={() => setOrderDraft((d) => ({ ...d, payment_required: !d.payment_required }))}>要求在线付款：{orderDraft.payment_required ? "是" : "否"}</Button></div></div>
              <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">交付与贸易条件</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Input value={orderDraft.incoterms_code} onChange={(e) => setOrderDraft((d) => ({ ...d, incoterms_code: e.target.value }))} placeholder="Incoterms，如 FOB" />
                <Input value={orderDraft.incoterms_version} onChange={(e) => setOrderDraft((d) => ({ ...d, incoterms_version: e.target.value }))} placeholder="Incoterms 版本" />
                <Input value={orderDraft.named_place} onChange={(e) => setOrderDraft((d) => ({ ...d, named_place: e.target.value }))} placeholder="指定地点 / 港口" />
                <Input type="date" value={orderDraft.delivery_date} onChange={(e) => setOrderDraft((d) => ({ ...d, delivery_date: e.target.value }))} />
                <Input value={orderDraft.origin_location} onChange={(e) => setOrderDraft((d) => ({ ...d, origin_location: e.target.value }))} placeholder="起运地" />
                <Input value={orderDraft.destination_location} onChange={(e) => setOrderDraft((d) => ({ ...d, destination_location: e.target.value }))} placeholder="目的地" />
                <div className="flex flex-wrap gap-1 sm:col-span-2"><Button size="sm" variant={orderDraft.shipping_policy === "asap" ? "default" : "outline"} onClick={() => setOrderDraft((d) => ({ ...d, shipping_policy: "asap" }))}>尽快发货</Button><Button size="sm" variant={orderDraft.shipping_policy === "when_ready" ? "default" : "outline"} onClick={() => setOrderDraft((d) => ({ ...d, shipping_policy: "when_ready" }))}>全部备妥后发货</Button></div>
              </div></div>
              <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">业务来源与追踪</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Input value={orderDraft.source_document} onChange={(e) => setOrderDraft((d) => ({ ...d, source_document: e.target.value }))} placeholder="来源单据" />
                <Input value={orderDraft.campaign} onChange={(e) => setOrderDraft((d) => ({ ...d, campaign: e.target.value }))} placeholder="营销活动" />
                <Input value={orderDraft.medium} onChange={(e) => setOrderDraft((d) => ({ ...d, medium: e.target.value }))} placeholder="媒介 / 渠道" />
                <Input value={orderDraft.source} onChange={(e) => setOrderDraft((d) => ({ ...d, source: e.target.value }))} placeholder="来源" />
              </div></div>
              <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditingOrderId("")}>取消</Button><Button size="sm" onClick={() => void saveOrderDetails()} disabled={busyId === order.id}>保存订单资料</Button></div>
            </div>}</Fragment>)}{filteredOrders.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><p className="text-xs text-muted-foreground">第 {listPage} / {pageCount} 页 · 共 {filteredOrders.length} 条订单 · 每页 {pageSize} 条</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={listPage <= 1} onClick={() => setListPage(value => Math.max(1, value - 1))}>上一页</Button><Button size="sm" variant="outline" disabled={listPage >= pageCount} onClick={() => setListPage(value => Math.min(pageCount, value + 1))}>下一页</Button></div></div>}
          {!filteredOrders.length && <p className="rounded-lg bg-muted/30 py-8 text-center text-sm text-muted-foreground">没有符合条件的订单。</p>}

        </section>}

        {view === "quotations" && <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">报价与询价</h2><span className="text-xs text-muted-foreground">{filteredQuotes.length} 份</span></div>
          {pagedQuotes.length > 0 && <div className="overflow-x-auto rounded-lg bg-background"><table className="w-full min-w-[900px] text-sm"><thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground"><tr className="border-b text-left"><th className="p-3">{sortLabel("order_number", "单据编号")}</th><th className="p-3">{sortLabel("title", "单据名称")}</th><th className="p-3">关联订单</th><th className="p-3">币种</th><th className="p-3">{sortLabel("created_at", "创建时间")}</th><th className="p-3">状态</th><th className="p-3 text-right">操作</th></tr></thead><tbody>{pagedQuotes.map((quote) => <tr key={quote.id} className="border-b last:border-0 hover:bg-muted/30"><td className="whitespace-nowrap p-3 font-medium tabular-nums">{quote.document_number}</td><td className="p-3 font-medium">{quote.title}<div className="text-xs text-muted-foreground">{typeLabels[quote.document_type] ?? quote.document_type}</div></td><td className="p-3">{quote.trade_orders?.order_number ?? "—"}</td><td className="p-3">{quote.currency_code}</td><td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{dateLabel(quote.created_at)}</td><td className="p-3"><Badge variant={quote.status === "issued" ? "success" : "secondary"}>{statusLabels[quote.status] ?? quote.status}</Badge></td><td className="p-3"><div className="flex justify-end gap-2">{quote.status !== "issued" && quote.status !== "void" && quote.status !== "archived" && <Button size="sm" onClick={() => void confirmQuote(quote)} disabled={busyId === quote.id}>确认并生成订单</Button>}<Button size="sm" variant="outline" onClick={onCreateQuotation}>制作后续单据</Button></div></td></tr>)}</tbody></table></div>}
          {!filteredQuotes.length && <p className="rounded-lg bg-muted/30 py-8 text-center text-sm text-muted-foreground">还没有报价单或采购询价单。可从单据制作创建。</p>}
          {filteredQuotes.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><p className="text-xs text-muted-foreground">第 {listPage} / {pageCount} 页 · 共 {filteredQuotes.length} 份报价与询价</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={listPage <= 1} onClick={() => setListPage(value => Math.max(1, value - 1))}>上一页</Button><Button size="sm" variant="outline" disabled={listPage >= pageCount} onClick={() => setListPage(value => Math.min(pageCount, value + 1))}>下一页</Button></div></div>}
        </section>}
      </CardContent>
    </Card>
  </div>;
}
