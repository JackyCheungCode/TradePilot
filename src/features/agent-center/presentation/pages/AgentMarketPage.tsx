import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Column,
  Dropdown,
  Grid,
  InlineNotification,
  Search,
  Tag,
  TextArea,
  Tile,
  Toggle,
} from "@carbon/react";
import { ArrowRight, Bot, Checkmark, Edit, Plug } from "@carbon/icons-react";
import { agentApi, type AgentConnection, type AgentProfile } from "../../infrastructure/agent-api";

const agentCatalog = [
  { id: "buyer_development", name: "全球买家开发 Agent", description: "跨国家、行业和渠道发现进口商、批发商及潜在采购商。", capabilities: ["买家发现", "企业调查", "线索筛选"], detail: "围绕目标市场和产品关键词发现潜在买家，并将可验证的企业线索交给后续研究与评估环节。" },
  { id: "market_research", name: "市场研究 Agent", description: "分析目标市场、品类需求、竞争格局和趋势信号。", capabilities: ["市场需求", "竞争分析", "趋势研究"], detail: "汇总目标国家、产品品类和竞争环境相关信息，形成市场研究结论。" },
  { id: "company_research", name: "企业调查 Agent", description: "研究企业官网、经营信息、联系方式与社交资产。", capabilities: ["企业背景", "联系方式", "社交资产"], detail: "围绕企业官网和公开信息整理企业背景、联系方式及社交媒体资产。" },
  { id: "lead_scoring", name: "客户评估 Agent", description: "综合企业规模、业务匹配度和采购潜力评估线索。", capabilities: ["客户画像", "匹配评估", "潜力评分"], detail: "结合企业信息、产品匹配度和可获得的采购信号，辅助判断潜客优先级。" },
  { id: "multilingual_sales", name: "多语言销售 Agent", description: "生成多语言开发信、翻译与询盘回复草稿。", capabilities: ["多语言写作", "翻译", "询盘回复"], detail: "生成供业务人员审核的多语言销售沟通草稿，不直接发送外部消息。" },
  { id: "follow_up", name: "外贸跟进 Agent", description: "整理跟进节奏、沟通摘要和下一步行动建议。", capabilities: ["沟通摘要", "跟进计划", "行动建议"], detail: "整理客户沟通上下文，提出下一步跟进建议，具体外部操作仍遵循审批规则。" },
  { id: "trade_compliance", name: "贸易合规 Agent", description: "辅助核查贸易限制、HS 编码和国家合规要求。", capabilities: ["贸易限制", "HS 编码", "合规核查"], detail: "辅助整理贸易合规相关信息，结果应由专业人员结合最新法规复核。" },
] as const;

const statusItems = [
  { id: "", text: "全部状态" },
  { id: "enabled", text: "已启用" },
  { id: "disabled", text: "已停用" },
];

type Notice = { kind: "success" | "error" | "info"; title: string; subtitle?: string };

export function AgentMarketPage() {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;
    void Promise.allSettled([agentApi.listProfiles(), agentApi.listConnections()]).then(([profileResult, connectionResult]) => {
      if (!alive) return;
      if (profileResult.status === "fulfilled") {
        setProfiles(profileResult.value);
      } else {
        setLoadError(profileResult.reason instanceof Error ? profileResult.reason.message : "加载 Agent 状态失败。");
      }
      setProfilesLoaded(true);
      if (connectionResult.status === "fulfilled") {
        setConnections(connectionResult.value);
      } else {
        setLoadError((current) => current || (connectionResult.reason instanceof Error ? connectionResult.reason.message : "加载外部 Agent 连接失败。"));
      }
      setConnectionsLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const isEnabled = (id: string) => profiles.find((row) => row.agent_key === id)?.enabled ?? false;
  const enabledCount = profilesLoaded ? agentCatalog.filter((agent) => isEnabled(agent.id)).length : null;
  const activeConnectionCount = connectionsLoaded ? connections.filter((connection) => connection.status === "active").length : null;
  const visibleAgents = useMemo(() => agentCatalog.filter((agent) => {
    const enabled = profiles.find((row) => row.agent_key === agent.id)?.enabled ?? false;
    const matchesStatus = !statusFilter || (statusFilter === "enabled" ? enabled : !enabled);
    const matchesSearch = [agent.name, agent.description, ...agent.capabilities].join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase());
    return matchesStatus && matchesSearch;
  }), [profiles, search, statusFilter]);

  const selectedAgent = agentCatalog.find((agent) => agent.id === selectedId);
  const selectedProfile = profiles.find((profile) => profile.agent_key === selectedId);
  const selectedEnabled = selectedProfile?.enabled ?? false;

  const openDetails = (id: string) => {
    const profile = profiles.find((row) => row.agent_key === id);
    setSelectedId(id);
    setPrompt(profile?.config?.systemPrompt ?? "");
    setNotice(null);
  };

  const toggleAgent = async (id: string) => {
    const current = profiles.find((row) => row.agent_key === id);
    const enabled = current?.enabled ?? true;
    setBusyId(id);
    setNotice(null);
    try {
      const agent = agentCatalog.find((item) => item.id === id);
      const saved = await agentApi.saveProfile(id, {
        enabled: !enabled,
        config: current?.config ?? { systemPrompt: "", description: agent?.description ?? "" },
      });
      setProfiles((rows) => [...rows.filter((row) => row.agent_key !== id), saved]);
      setNotice({ kind: "success", title: (agent?.name ?? "Agent") + (saved.enabled ? " 已启用。" : " 已停用。") });
    } catch (error) {
      setNotice({ kind: "error", title: "更新 Agent 状态失败", subtitle: error instanceof Error ? error.message : "请稍后重试。" });
    } finally {
      setBusyId(null);
    }
  };

  const savePrompt = async () => {
    if (!selectedAgent || !selectedId) return;
    setSavingPrompt(true);
    setNotice(null);
    try {
      const saved = await agentApi.saveProfile(selectedId, {
        enabled: selectedEnabled,
        config: { ...(selectedProfile?.config ?? { systemPrompt: "", description: selectedAgent.description }), systemPrompt: prompt.trim(), description: selectedAgent.description },
      });
      setProfiles((rows) => [...rows.filter((row) => row.agent_key !== selectedId), saved]);
      setPrompt(saved.config?.systemPrompt ?? prompt.trim());
      setNotice({ kind: "success", title: "专业指令已保存。" });
    } catch (error) {
      setNotice({ kind: "error", title: "保存专业指令失败", subtitle: error instanceof Error ? error.message : "请稍后重试。" });
    } finally {
      setSavingPrompt(false);
    }
  };

  const openConnections = () => { window.location.href = "/agent/connections"; };

  return (
    <main className="tp-agent-market-page">
      <header className="tp-agent-market-header">
        <div className="tp-agent-market-header__content">
          <p className="tp-agent-market-eyebrow">TRADEPILOT / AGENT</p>
          <h1>Agent 市场</h1>
          <p>发现、查看和管理 TradePilot 的业务智能体。</p>
        </div>
        <Button kind="primary" onClick={openConnections} renderIcon={Plug}>接入外部 Agent</Button>
      </header>

      <Grid fullWidth className="tp-agent-market-summary">
        <Column sm={4} md={4} lg={5}>
          <Tile className="tp-agent-market-metric">
            <p className="tp-agent-market-metric__value">{agentCatalog.length}</p>
            <p className="tp-agent-market-metric__label">内置 Agent</p>
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={5}>
          <Tile className="tp-agent-market-metric">
            <p className="tp-agent-market-metric__value">{profilesLoaded ? enabledCount : "—"}</p>
            <p className="tp-agent-market-metric__label">{profilesLoaded ? "已启用" : "正在读取启用状态"}</p>
          </Tile>
        </Column>
        <Column sm={4} md={4} lg={6}>
          <Tile className="tp-agent-market-metric">
            <p className="tp-agent-market-metric__value">{connectionsLoaded ? activeConnectionCount : "—"}</p>
            <p className="tp-agent-market-metric__label">已验证的外部 Agent 连接</p>
          </Tile>
        </Column>
      </Grid>

      <section className="tp-agent-market-controls" aria-label="搜索和筛选 Agent">
        <div className="tp-agent-market-search">
          <Search
            id="agent-market-search"
            labelText="搜索 Agent"
            placeholder="按名称、业务能力或用途搜索"
            value={search}
            size="lg"
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </div>
        <div className="tp-agent-market-status">
          <Dropdown
            id="agent-market-status"
            titleText="启用状态"
            size="lg"
            label="全部状态"
            items={statusItems}
            itemToString={(item) => item?.text ?? ""}
            selectedItem={statusItems.find((item) => item.id === statusFilter) ?? statusItems[0]}
            onChange={({ selectedItem }) => setStatusFilter(selectedItem?.id ?? "")}
          />
        </div>
        <p className="tp-agent-market-result-count">{visibleAgents.length} 个 Agent</p>
      </section>

      {loadError && <InlineNotification kind="error" title="数据读取失败" subtitle={loadError} lowContrast hideCloseButton />}
      {notice && <InlineNotification kind={notice.kind} title={notice.title} subtitle={notice.subtitle} lowContrast hideCloseButton />}

      <section className="tp-agent-market-catalog" aria-label="内置 Agent 目录">
        <div className="tp-agent-market-section-heading">
          <div><h2>内置 Agent</h2><p>选择一个 Agent 查看能力、执行边界和配置。</p></div>
        </div>
        <Grid fullWidth className="tp-agent-market-grid">
          {visibleAgents.map((agent) => {
            const enabled = isEnabled(agent.id);
            return (
              <Column key={agent.id} sm={4} md={4} lg={4}>
              <Tile className="tp-agent-market-agent-tile">
                <div className="tp-agent-market-card-heading">
                  <Bot size={20} aria-hidden="true" />
                  <Tag type={enabled ? "green" : "cool-gray"} size="sm">{enabled ? "已启用" : "已停用"}</Tag>
                </div>
                <h3>{agent.name}</h3>
                <p className="tp-agent-market-card-description">{agent.description}</p>
                <div className="tp-agent-market-capabilities">{agent.capabilities.map((capability) => <Tag key={capability} type="blue" size="sm">{capability}</Tag>)}</div>
                <div className="tp-agent-market-card-actions">
                  <Button kind="ghost" size="sm" renderIcon={Edit} onClick={() => openDetails(agent.id)}>查看详情</Button>
                  <Toggle
                    id={"agent-enabled-" + agent.id}
                    labelText="启用"
                    labelA="关"
                    labelB="开"
                    toggled={enabled}
                    disabled={!profilesLoaded || Boolean(loadError) || busyId !== null}
                    onToggle={() => void toggleAgent(agent.id)}
                  />
                </div>
              </Tile>
              </Column>
            );
          })}
          {visibleAgents.length === 0 && <Column sm={4} md={8} lg={16}><div className="tp-agent-market-empty">没有匹配的 Agent，请调整搜索或筛选条件。</div></Column>}
        </Grid>
      </section>

      {selectedAgent && (
        <section className="tp-agent-market-detail" aria-label="Agent 详情与配置">
          <div className="tp-agent-market-section-heading">
            <div><h2>{selectedAgent.name}</h2><p>Agent 详情与专业指令配置</p></div>
            <Button kind="ghost" size="sm" onClick={() => setSelectedId(null)}>关闭</Button>
          </div>
          <Grid fullWidth className="tp-agent-market-detail-grid">
            <Column sm={4} md={4} lg={8}>
              <h3>业务能力</h3>
              <p>{selectedAgent.detail}</p>
              <div className="tp-agent-market-capabilities">{selectedAgent.capabilities.map((capability) => <Tag key={capability} type="blue" size="sm">{capability}</Tag>)}</div>
            </Column>
            <Column sm={4} md={4} lg={8}>
              <h3>执行边界</h3>
              <p>搜索、研究和分析按系统预算策略执行；发送消息、批量导入及其他外部写操作仍需人工审批。</p>
            </Column>
          </Grid>
          <div className="tp-agent-market-prompt">
            <TextArea
              id="agent-system-prompt"
              labelText="专业指令（System Prompt）"
              rows={7}
              value={prompt}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              placeholder="定义该 Agent 的专业职责、分析规则和输出要求。"
            />
            <div className="tp-agent-market-prompt-actions">
              <p>修改后需明确保存，未保存内容不会自动提交。</p>
              <Button disabled={savingPrompt || Boolean(loadError)} onClick={() => void savePrompt()} renderIcon={Checkmark}>保存专业指令</Button>
            </div>
          </div>
        </section>
      )}

      <section className="tp-agent-market-external">
        <div className="tp-agent-market-section-heading">
          <div><h2>外部 Agent</h2><p>仅统计已登记并通过连接验证的外部 Agent。尚未接入的服务不会作为可用 Agent 展示。</p></div>
        </div>
        <Tile className="tp-agent-market-external-empty">
          <Plug size={22} aria-hidden="true" />
          <div><strong>外部 Agent 通过连接管理接入</strong><p>连接验证通过后，将在此目录统计并管理。</p></div>
          <Button kind="ghost" onClick={openConnections} renderIcon={ArrowRight}>管理连接</Button>
        </Tile>
      </section>
    </main>
  );
}
