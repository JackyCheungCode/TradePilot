import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  Column,
  ComboBox,
  Grid,
  InlineNotification,
  Layer,
  Loading,
  RadioButton,
  RadioButtonGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import {
  ArrowUp,
  Bot,
  Chat,
  CheckmarkFilled,
  Time,
  Earth,
  History,
  Tools,
} from "@carbon/icons-react";
import { AgentOrbIcon } from "./AgentOrbIcon";
import { agentApi, type AgentConnection } from "../../infrastructure/agent-api";

type ChatRecord = {
  id: string;
  name: string;
  country_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  business_type?: string | null;
  record_type?: string;
  channel?: string;
  sources?: Array<{ provider?: string; source_url?: string }>;
  raw_data?: Record<string, unknown>;
};
type ChatMessage = {
  id: string | number;
  role: "user" | "assistant";
  content: string;
  kind?: "progress" | "result";
  records?: ChatRecord[];
  runId?: string;
};
type Conversation = { id: string; title: string; last_message_at: string; created_at: string };
const agentOptions = [
  { id: "auto", name: "小雅自动调度" },
  { id: "buyer_development", name: "全球买家开发" },
  { id: "market_research", name: "市场研究" },
  { id: "company_research", name: "企业调查" },
  { id: "lead_scoring", name: "客户评估" },
  { id: "multilingual_sales", name: "多语言销售" },
  { id: "follow_up", name: "外贸跟进" },
  { id: "trade_compliance", name: "贸易合规" },
];
const welcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "你好，我是小雅。告诉我你想开发什么市场、寻找哪类客户，或者指定一位专业 Agent。我会先整理任务计划，等你确认后再执行。",
};

export function AgentChatWorkspace({ connections, onNotice }: { connections: AgentConnection[]; onNotice: (message: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([welcome]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("auto");
  const [country, setCountry] = useState("US");
  const [mode, setMode] = useState<"planner" | "internal" | "external">("planner");
  const [connectionId, setConnectionId] = useState("");
  const [toolName, setToolName] = useState("");
  const [argsJson, setArgsJson] = useState("{}");
  const [planGoal, setPlanGoal] = useState("");
  const [showPlan, setShowPlan] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; title: string; subtitle?: string }>();

  const activeConnections = connections.filter((item) => item.status === "active");
  const selectedConnection = activeConnections.find((item) => item.id === connectionId);
  const availableTools = selectedConnection?.protocol_tools ?? [];

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const rows = await agentApi.listConversations();
        if (!alive) return;
        setConversations(rows);
        if (rows.length) {
          await openConversation(rows[0].id, alive);
        } else {
          const created = await agentApi.createConversation("新聊天");
          if (!alive) return;
          setConversations([created]);
          setConversationId(created.id);
          setMessages([welcome]);
        }
      } catch (error) {
        if (alive) onNotice(error instanceof Error ? error.message : "加载历史聊天失败。");
      } finally {
        if (alive) setHistoryLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!busy) return;
    setWaitSeconds(0);
    const started = Date.now();
    const timer = window.setInterval(() => setWaitSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (!activeRunId) return;
    let alive = true;
    const poll = async () => {
      try {
        const snapshot = await agentApi.getRun(activeRunId);
        if (!alive) return;
        const run = snapshot.run;
        const status = run.status;
        const progress = snapshot.discoveryRun?.progress;
        const latest = snapshot.logs.at(-1)?.message ?? snapshot.events.at(-1)?.message ?? snapshot.discoveryRun?.message ?? "";
        const statusLabel = status === "queued" ? "排队中" : status === "running" ? "执行中" : status === "awaiting_approval" ? "等待人工审批" : status === "succeeded" ? "执行成功" : status === "completed" ? "执行完成" : status === "partial" ? "部分完成" : status === "failed" ? "执行失败" : status;
        const message = [statusLabel, typeof progress === "number" ? "进度 " + progress + "%" : "", latest].filter(Boolean).join(" · ");
        setMessages((current) => {
          const index = current.findIndex((item) => item.id === "active-progress");
          if (index < 0) return [...current, { id: "active-progress", role: "assistant", content: message, kind: "progress" }];
          const next = [...current];
          next[index] = { ...next[index], content: message };
          return next;
        });
        if (["succeeded", "completed", "partial", "failed", "cancelled", "awaiting_approval", "planned"].includes(status)) {
          const records = snapshot.records ?? [];
          const count = records.length + " 条可查看明细";
          const result = status === "awaiting_approval" ? "任务已暂停，等待你在审批中心确认。" : status === "failed" ? (run.error_message ?? "任务执行失败，请查看执行记录。") : status === "partial" ? "任务部分完成。" + count + "，请检查下方明细和执行日志。" : status === "cancelled" ? "任务已取消。" : "任务已完成。" + count + "。";
          setMessages((current) => [...current.filter((item) => item.id !== "active-result"), { id: "active-result", role: "assistant", content: result, kind: "result", records, runId: activeRunId }]);
          setActiveRunId(null);
        }
      } catch (error) {
        if (alive) onNotice(error instanceof Error ? error.message : "读取任务进度失败。");
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [activeRunId, onNotice]);

  async function openConversation(id: string, alive = true) {
    if (busy) return;
    setHistoryLoading(true);
    try {
      const rows = await agentApi.listConversationMessages(id);
      if (!alive) return;
      setConversationId(id);
      const restored: ChatMessage[] = rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        ...(row.metadata?.kind === "result" ? { kind: "result" as const } : {}),
        ...(typeof row.metadata?.runId === "string" ? { runId: row.metadata.runId } : {}),
      }));
      for (const item of restored) {
        if (item.runId) {
          try {
            const snapshot = await agentApi.getRun(item.runId);
            item.records = snapshot.records ?? [];
          } catch { /* Keep saved messages visible when an old run is unavailable. */ }
        }
      }
      setMessages(restored.length ? restored : [welcome]);
      const task = rows.at(-1)?.metadata?.task as { goal?: string; agentKey?: string; country?: string; mode?: "planner" | "internal" | "external" } | undefined;
      if (task?.goal) {
        setPlanGoal(task.goal);
        setSelectedAgent(task.agentKey ?? "auto");
        setCountry(task.country ?? "US");
        setMode(task.mode ?? "planner");
        setShowPlan(true);
      } else setShowPlan(false);
      setActiveRunId(null);
      setShowHistory(false);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "读取历史聊天失败。");
    } finally {
      if (alive) setHistoryLoading(false);
    }
  }

  async function startNewChat() {
    if (busy) return;
    try {
      const row = await agentApi.createConversation("新聊天");
      setConversations((old) => [row, ...old]);
      setConversationId(row.id);
      setMessages([welcome]);
      setDraft("");
      setShowPlan(false);
      setPlanGoal("");
      setActiveRunId(null);
      setShowHistory(false);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "新建聊天失败。");
    }
  }

  async function saveAssistantMessage(content: string, metadata: Record<string, unknown> = {}) {
    if (!conversationId) return;
    try {
      await agentApi.saveConversationMessage(conversationId, { role: "assistant", content, metadata });
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "保存聊天记录失败。");
    }
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    setNotice(undefined);
    setMessages((old) => [...old, { id: Date.now(), role: "user", content: text }, { id: Date.now() + 1, role: "assistant", content: "小雅正在理解你的需求…", kind: "progress" }]);
    try {
      const response = await agentApi.chat(text, conversationId);
      setConversationId(response.conversationId);
      setConversations((old) => [{ id: response.conversationId, title: text.slice(0, 100), last_message_at: new Date().toISOString(), created_at: old.find((item) => item.id === response.conversationId)?.created_at ?? new Date().toISOString() }, ...old.filter((item) => item.id !== response.conversationId)]);
      setMessages((old) => [...old.filter((item) => !(item.kind === "progress" && item.content === "小雅正在理解你的需求…")), { id: Date.now() + 2, role: "assistant", content: response.reply }]);
      if (response.task) {
        setPlanGoal(response.task.goal);
        setSelectedAgent(response.task.agentKey);
        setCountry(response.task.country);
        setMode(response.task.mode);
        setShowPlan(true);
      }
    } catch (error) {
      setMessages((old) => [...old.filter((item) => !(item.kind === "progress" && item.content === "小雅正在理解你的需求…")), { id: Date.now() + 3, role: "assistant", content: error instanceof Error ? error.message : "小雅暂时无法回复，请稍后重试。", kind: "result" }]);
    } finally {
      setBusy(false);
    }
  }

  async function confirmTask() {
    if (!planGoal.trim() || busy) return;
    setBusy(true);
    setNotice(undefined);
    setMessages((old) => [...old, { id: Date.now(), role: "assistant", content: "小雅正在提交任务，稍后会在这里反馈状态…", kind: "progress" }]);
    try {
      if (mode === "external") {
        if (!selectedConnection || !toolName) throw new Error("请先选择已连接的外部 Agent 和工具。");
        let args: Record<string, unknown>;
        try {
          const parsed = JSON.parse(argsJson);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
          args = parsed as Record<string, unknown>;
        } catch { throw new Error("工具参数必须是有效 JSON 对象。"); }
        const run = await agentApi.createRun(planGoal);
        const result = await agentApi.invokeConnection(selectedConnection.id, run.id, toolName, args);
        const message = result.status === "awaiting_approval" ? "任务已提交审批中心。批准后才会执行外部写操作。" : result.status === "succeeded" ? "外部工具已执行，结果已写入执行记录。" : "外部工具状态：" + result.status;
        setMessages((old) => [...old, { id: Date.now() + 2, role: "assistant", content: message, kind: "result" }]);
        await saveAssistantMessage(message, { kind: "result" });
      } else {
        const run = await agentApi.createRun(planGoal, {
          mode: mode === "planner" ? "planner" : "internal_discovery",
          country: country.toUpperCase(),
          searchEngine: "serper",
          limitPerCountry: 50,
          ...(selectedAgent !== "auto" ? { agentKey: selectedAgent } : {}),
        });
        if (["queued", "running"].includes(run.status)) setActiveRunId(run.id);
        const planner = run.plan?.planner as { summary?: string; steps?: string[] } | undefined;
        const status = run.status === "awaiting_approval" ? "等待人工审批" : run.status === "planned" ? "等待补充执行条件" : run.status === "failed" ? "执行失败" : "已进入统一任务执行中心";
        const detail = [planner?.summary ?? run.message ?? "小雅已接收任务。", status, "任务编号：" + (run.taskCode ?? run.id), ...(planner?.steps ?? []).map((step, index) => (index + 1) + ". " + step)].join("\n");
        setMessages((old) => [...old, { id: Date.now() + 2, role: "assistant", content: detail, kind: "result" }]);
        await saveAssistantMessage(detail, { kind: "result", runId: run.id });
      }
      setShowPlan(false);
    } catch (error) {
      setMessages((old) => [...old, { id: Date.now() + 3, role: "assistant", content: error instanceof Error ? error.message : "任务提交失败。", kind: "result" }]);
    } finally {
      setBusy(false);
    }
  }

  const agentItems = agentOptions.map((item) => ({ id: item.id, text: item.name }));
  const connectionItems = activeConnections.map((item) => ({ id: item.id, text: item.name }));
  const toolItems = availableTools.map((item) => ({ id: item.name, text: item.name }));
  return (
    <Stack gap={5} className="agent-workbench-v2">
      <Grid fullWidth>
        <Column sm={4} md={8} lg={11}>
          <Tile className="agent-workbench-v2__chat">
            <Stack gap={0}>
              <Layer className="agent-workbench-v2__toolbar">
                <Stack orientation="horizontal" gap={3} className="agent-workbench-v2__toolbar-actions">
                  <Button kind="tertiary" size="sm" renderIcon={Chat} disabled={busy} onClick={() => void startNewChat()}>新建聊天</Button>
                  <Button kind="tertiary" size="sm" renderIcon={History} onClick={() => setShowHistory((value) => !value)}>历史记录</Button>
                </Stack>
                <div className="agent-workbench-v2__identity">
                  <AgentOrbIcon className="agent-workbench-v2__avatar" sizePx={44} state={busy ? "working" : "happy"} />
                  <div className="agent-workbench-v2__identity-copy">
                    <p className="cds--type-heading-compact-01">小雅 <span className="cds--type-helper-text-01">TradePilot 总协调 Agent</span></p>
                    <p className="cds--type-helper-text-01">多轮对话 · 任务理解 · Agent 调度</p>
                  </div>
                  <Tag type="green" size="sm">在线</Tag>
                </div>
              </Layer>
              {showHistory && (
                <Layer className="agent-workbench-v2__history">
                  <Stack gap={3}>
                    <div className="agent-workbench-v2__section-heading">
                      <h3 className="cds--type-heading-compact-01">历史聊天</h3>
                      <Button kind="ghost" size="sm" onClick={() => setShowHistory(false)}>收起</Button>
                    </div>
                    {historyLoading ? <Loading withOverlay={false} small description="正在读取历史记录" /> : conversations.length === 0 ? <p className="cds--type-body-compact-01">暂无历史聊天</p> : (
                      <Stack gap={1}>
                        {conversations.map((item) => (
                          <Button key={item.id} kind={conversationId === item.id ? "tertiary" : "ghost"} size="sm" className="agent-workbench-v2__history-item" onClick={() => void openConversation(item.id)}>
                            <span>{item.title || "新聊天"}</span>
                            <span className="cds--type-helper-text-01">{new Date(item.last_message_at).toLocaleString()}</span>
                          </Button>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Layer>
              )}
              <div className="agent-workbench-v2__messages" aria-live="polite">
                {messages.map((message) => (
                  <div key={message.id} className={message.role === "user" ? "agent-workbench-v2__message agent-workbench-v2__message--user" : "agent-workbench-v2__message"}>
                    <div className="agent-workbench-v2__message-meta">
                      {message.role === "assistant" ? <><Bot size={16} />小雅</> : "你"}
                      {message.kind === "progress" && <Tag type="blue" size="sm">处理中</Tag>}
                      {message.kind === "result" && <Tag type="green" size="sm">任务反馈</Tag>}
                    </div>
                    <Layer className="agent-workbench-v2__message-content">
                      <p className="cds--type-body-compact-01">{message.content}</p>
                      {message.records && message.records.length > 0 && (
                        <div className="agent-workbench-v2__results">
                          <div className="agent-workbench-v2__section-heading">
                            <p className="cds--type-label-01">本次发现明细 · {message.records.length} 条</p>
                            <Button kind="tertiary" size="sm" onClick={() => { window.location.href = "/lead-discovery/results?runId=" + encodeURIComponent(message.runId ?? ""); }}>打开完整结果</Button>
                          </div>
                          <div className="agent-workbench-v2__table-scroll">
                            <Table size="sm">
                              <TableHead>
                                <TableRow>
                                  <TableHeader>企业 / 网站</TableHeader>
                                  <TableHeader>国家</TableHeader>
                                  <TableHeader>业务</TableHeader>
                                  <TableHeader>联系方式</TableHeader>
                                  <TableHeader>发现来源</TableHeader>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {message.records.map((record) => (
                                  <TableRow key={record.id}>
                                    <TableCell>
                                      <strong>{record.name || "未命名记录"}</strong>
                                      {record.website ? <p><a href={record.website} target="_blank" rel="noreferrer">{record.website}</a></p> : <p>未发现官网</p>}
                                      <Accordion size="sm"><AccordionItem title="完整字段"><pre>{JSON.stringify({ address: record.address, raw_data: record.raw_data, sources: record.sources }, null, 2)}</pre></AccordionItem></Accordion>
                                    </TableCell>
                                    <TableCell>{record.country_code ?? "—"}</TableCell>
                                    <TableCell>{record.business_type ?? record.record_type ?? "—"}</TableCell>
                                    <TableCell>{record.phone && <p>{record.phone}</p>}{record.email && <p>{record.email}</p>}{!record.phone && !record.email && "未采集"}</TableCell>
                                    <TableCell>{[...new Set((record.sources ?? []).map((source) => source.provider).filter(Boolean))].join("、") || record.channel || "—"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </Layer>
                  </div>
                ))}
              </div>
              {showPlan && (
                <Layer className="agent-workbench-v2__plan">
                  <Stack gap={4}>
                    <div className="agent-workbench-v2__section-heading">
                      <h3 className="cds--type-heading-compact-01">任务确认</h3>
                      <Tag type="blue">待你确认</Tag>
                    </div>
                    <div className="agent-workbench-v2__goal">
                      <p className="cds--type-label-01">任务目标</p>
                      <p className="cds--type-body-compact-01">{planGoal}</p>
                    </div>
                    <Grid>
                      <Column sm={4} md={4} lg={8}>
                        <ComboBox
                          id="agent-workspace-agent"
                          titleText="执行 Agent"
                          items={agentItems}
                          itemToString={(item) => item?.text ?? ""}
                          selectedItem={agentItems.find((item) => item.id === selectedAgent) ?? null}
                          onChange={({ selectedItem }) => setSelectedAgent(selectedItem?.id ?? "auto")}
                        />
                      </Column>
                      <Column sm={4} md={4} lg={4}>
                        <TextInput id="agent-workspace-country" labelText="目标国家 / 市场代码" value={country} maxLength={2} onChange={(event) => setCountry(event.target.value.toUpperCase())} />
                      </Column>
                    </Grid>
                    <RadioButtonGroup legendText="执行方式" name="agent-workspace-mode" value={mode} onChange={(value) => setMode(String(value) as "planner" | "internal" | "external")} orientation="vertical">
                      <RadioButton id="agent-workspace-mode-planner" value="planner" labelText="小雅规划" />
                      <RadioButton id="agent-workspace-mode-internal" value="internal" labelText="内置搜索" />
                      <RadioButton id="agent-workspace-mode-external" value="external" labelText="外部工具" />
                    </RadioButtonGroup>
                    {mode === "external" && (
                      <Stack gap={3}>
                        <ComboBox id="agent-workspace-connection" titleText="外部 Agent" items={connectionItems} itemToString={(item) => item?.text ?? ""} selectedItem={connectionItems.find((item) => item.id === connectionId) ?? null} onChange={({ selectedItem }) => { setConnectionId(selectedItem?.id ?? ""); setToolName(""); }} />
                        <ComboBox id="agent-workspace-tool" titleText="工具" items={toolItems} itemToString={(item) => item?.text ?? ""} selectedItem={toolItems.find((item) => item.id === toolName) ?? null} onChange={({ selectedItem }) => setToolName(selectedItem?.id ?? "")} />
                        <TextArea id="agent-workspace-args" labelText="工具参数 JSON" value={argsJson} rows={4} onChange={(event) => setArgsJson(event.target.value)} />
                      </Stack>
                    )}
                    <div className="agent-workbench-v2__actions">
                      <Button kind="tertiary" onClick={() => setShowPlan(false)}>取消</Button>
                      <Button renderIcon={ArrowUp} disabled={busy || (mode !== "external" && !/^[A-Z]{2}$/.test(country)) || (mode === "external" && (!connectionId || !toolName))} onClick={() => void confirmTask()}>{busy ? "正在提交…" : "确认并启动任务"}</Button>
                    </div>
                  </Stack>
                </Layer>
              )}
              <Layer className="agent-workbench-v2__composer">
                <Stack gap={3}>
                  <div className="agent-workbench-v2__quick-actions">
                    <span className="cds--type-helper-text-01">快速指定：</span>
                    {agentOptions.slice(1).map((agent) => <Button key={agent.id} kind="ghost" size="sm" onClick={() => setDraft((value) => (value ? value + " " : "") + "@" + agent.name + " ")}>@{agent.name}</Button>)}
                  </div>
                  <div className="agent-workbench-v2__compose-row">
                    <TextArea id="agent-workspace-message" labelText="发送消息给小雅" hideLabel rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="告诉小雅你的目标… 输入 @ 指定专业 Agent，Enter 发送" />
                    <Button hasIconOnly iconDescription="发送消息" renderIcon={ArrowUp} disabled={!draft.trim() || busy} onClick={() => void sendMessage()} />
                  </div>
                  <p className="cds--type-helper-text-01">{busy ? "小雅正在处理 · " + waitSeconds + " 秒" : "小雅会先整理任务建议；只有你确认后才会启动执行。邮件发送、批量导入等操作仍需人工审批。"}</p>
                </Stack>
              </Layer>
            </Stack>
          </Tile>
        </Column>
        <Column sm={4} md={8} lg={5}>
          <Stack gap={4}>
            <Tile className="agent-workbench-v2__side-tile">
              <Stack gap={3}>
                <div className="agent-workbench-v2__side-heading"><Earth size={18} /><h3 className="cds--type-heading-compact-01">当前工作区</h3></div>
                <div><p className="cds--type-helper-text-01">默认协调者</p><p className="cds--type-body-compact-01">小雅</p></div>
                <div><p className="cds--type-helper-text-01">已连接外部 Agent</p><p className="cds--type-body-compact-01">{activeConnections.length} 个</p></div>
                <div><p className="cds--type-helper-text-01">执行模式</p><p className="cds--type-body-compact-01">{mode === "planner" ? "AI 自动规划" : mode === "internal" ? "内置搜索" : "外部工具"}</p></div>
              </Stack>
            </Tile>
            <Tile className="agent-workbench-v2__side-tile">
              <Stack gap={3}>
                <h3 className="cds--type-heading-compact-01">安全执行策略</h3>
                <div className="agent-workbench-v2__policy-row"><span className="cds--type-body-compact-01">搜索与分析</span><Tag type="green">自动执行</Tag></div>
                <div className="agent-workbench-v2__policy-row"><span className="cds--type-body-compact-01">邮件 / 批量导入</span><Tag type="gray">人工审批</Tag></div>
                <p className="cds--type-helper-text-01">任务进入统一任务执行中心；审批和执行记录保留在原有模块。</p>
              </Stack>
            </Tile>
            <Tile className="agent-workbench-v2__side-tile">
              <Stack gap={3}>
                <div className="agent-workbench-v2__side-heading"><Tools size={18} /><h3 className="cds--type-heading-compact-01">可用工具</h3></div>
                <p className="cds--type-body-compact-01">内置 Agent、REST API、MCP 与 Webhook 接入共用同一工作台。</p>
                <div className="agent-workbench-v2__policy-row"><span className="cds--type-body-compact-01">任务需确认后启动</span><CheckmarkFilled size={16} /></div>
                <div className="agent-workbench-v2__policy-row"><span className="cds--type-body-compact-01">对话上下文持续保存</span><Time size={16} /></div>
              </Stack>
            </Tile>
          </Stack>
        </Column>
      </Grid>
      {notice && <InlineNotification kind={notice.kind} title={notice.title} subtitle={notice.subtitle} lowContrast hideCloseButton />}
    </Stack>
  );
}
