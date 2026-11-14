import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, CheckCircle2, ClipboardList, FileText, RefreshCw, Search, ShoppingCart, Truck } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/shared/ui/primitives";
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

export function OrderCenterPage({ onCreateQuotation }: { onCreateQuotation: () => void }) {
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [documents, setDocuments] = useState<TradeDocument[]>([]);
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");

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
    return (order.order_number + " " + order.title + " " + account).toLowerCase().includes(search.toLowerCase());
  }), [orders, view, search]);
  const filteredQuotes = useMemo(() => quotations.filter((item) => {
    const related = item.trade_orders?.order_number ?? "";
    return (item.document_number + " " + item.title + " " + related).toLowerCase().includes(search.toLowerCase());
  }), [quotations, search]);
  const visibleQuotes = view === "sales" ? filteredQuotes.filter((item) => item.document_type === "quotation") : view === "purchase" ? filteredQuotes.filter((item) => item.document_type === "request_for_quotation") : filteredQuotes;

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

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-muted-foreground" /><h1 className="text-2xl font-semibold tracking-tight">订单中心</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">统一管理销售报价、采购询价、销售订单与采购订单，跟踪从报价到履约的业务状态。</p>
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
        </div>
        <div className="flex flex-wrap gap-2">
          {([{ key: "all", label: "全部" }, { key: "quotations", label: "报价与询价" }, { key: "sales", label: "销售业务" }, { key: "purchase", label: "采购业务" }] as const).map((item) => <Button key={item.key} size="sm" variant={view === item.key ? "default" : "outline"} onClick={() => setView(item.key)}>{item.label}</Button>)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {view !== "quotations" && <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">订单</h2><span className="text-xs text-muted-foreground">{filteredOrders.length} 条</span></div>
          {filteredOrders.map((order) => <div key={order.id} className="rounded-lg bg-muted/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{order.title}</p><Badge variant={order.status === "active" ? "success" : "secondary"}>{statusLabels[order.status] ?? order.status}</Badge><Badge variant="outline">{order.order_type === "sales" ? "销售订单" : "采购订单"}</Badge></div>
                <p className="mt-1 text-xs text-muted-foreground">{order.order_number} · {order.crm_account?.account_name ?? "未关联客户"} · 创建于 {dateLabel(order.created_at)}</p>
                <p className="mt-2 text-sm font-medium tabular-nums">{money(amountFor(order), order.currency_code)} <span className="font-normal text-muted-foreground">· {(order.trade_order_items ?? []).length} 个产品行</span></p>
                <p className="mt-1 text-xs text-muted-foreground">{[order.payment_terms, order.incoterms_code && (order.incoterms_code + (order.named_place ? " · " + order.named_place : "")), order.delivery_date && ("交货 " + dateLabel(order.delivery_date))].filter(Boolean).join(" / ") || "尚未设置付款与交付条件"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {order.status === "draft" && <Button size="sm" onClick={() => void changeOrderStatus(order, "active")} disabled={busyId === order.id}>开始执行</Button>}
                {order.status === "active" && <><Button size="sm" variant="outline" onClick={() => void changeOrderStatus(order, "completed")} disabled={busyId === order.id}>标记完成</Button><Button size="sm" variant="ghost" onClick={() => void changeOrderStatus(order, "cancelled")} disabled={busyId === order.id}>取消</Button></>}
                <Button size="sm" variant="ghost" onClick={onCreateQuotation}>制作单据 <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>)}
          {!filteredOrders.length && <p className="rounded-lg bg-muted/30 py-8 text-center text-sm text-muted-foreground">没有符合条件的订单。</p>}
        </section>}

        {view !== "sales" && view !== "purchase" && <div className="border-t" />}
        {view !== "sales" && view !== "purchase" && <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">报价与询价</h2><span className="text-xs text-muted-foreground">{filteredQuotes.length} 份</span></div>
          {filteredQuotes.map((quote) => <div key={quote.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-4">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{quote.title}</p><Badge variant={quote.status === "issued" ? "success" : "secondary"}>{statusLabels[quote.status] ?? quote.status}</Badge><Badge variant="outline">{typeLabels[quote.document_type] ?? quote.document_type}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{quote.document_number} · 关联订单 {quote.trade_orders?.order_number ?? "—"} · {quote.currency_code} · {dateLabel(quote.created_at)}</p></div>
            <div className="flex flex-wrap gap-2">{quote.status !== "issued" && quote.status !== "void" && quote.status !== "archived" && <Button size="sm" onClick={() => void confirmQuote(quote)} disabled={busyId === quote.id}>确认并生成订单</Button>}<Button size="sm" variant="outline" onClick={onCreateQuotation}>制作后续单据</Button></div>
          </div>)}
          {!filteredQuotes.length && <p className="rounded-lg bg-muted/30 py-8 text-center text-sm text-muted-foreground">还没有报价单或采购询价单。可从单据制作创建。</p>}
        </section>}
      </CardContent>
    </Card>
  </div>;
}
