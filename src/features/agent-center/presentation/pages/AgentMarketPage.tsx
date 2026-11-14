import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, Checkmark, Edit, Plug } from "@carbon/icons-react";
import { Button, Card, CardContent, Combobox, Textarea, Badge } from "@/shared/ui/primitives";
import { Input } from "@/shared/ui/primitives";
import { PageControlPanel } from "@/shared/ui/page-layout";
import { agentApi, type AgentProfile } from "../../infrastructure/agent-api";

const agentCatalog = [
  { id: "buyer_development", name: "全球买家开发 Agent", description: "跨国家、行业和渠道发现进口商、批发商及潜在采购商。", capabilities: ["买家发现", "企业调查", "线索筛选"], detail: "围绕目标市场和产品关键词发现潜在买家，并将可验证的企业线索交给后续研究与评估环节。" },
  { id: "market_research", name: "市场研究 Agent", description: "分析目标市场、品类需求、竞争格局和趋势信号。", capabilities: ["市场需求", "竞争分析", "趋势研究"], detail: "汇总目标国家、产品品类和竞争环境相关信息，形成市场研究结论。" },
  { id: "company_research", name: "企业调查 Agent", description: "研究企业官网、经营信息、联系方式与社交资产。", capabilities: ["企业背景", "联系方式", "社交资产"], detail: "围绕企业官网和公开信息整理企业背景、联系方式及社交媒体资产。" },
  { id: "lead_scoring", name: "客户评估 Agent", description: "综合企业规模、业务匹配度和采购潜力评估线索。", capabilities: ["客户画像", "匹配评估", "潜力评分"], detail: "结合企业信息、产品匹配度和可获得的采购信号，辅助判断潜客优先级。" },
  { id: "multilingual_sales", name: "多语言销售 Agent", description: "生成多语言开发信、翻译与询盘回复草稿。", capabilities: ["多语言写作", "翻译", "询盘回复"], detail: "生成供业务人员审核的多语言销售沟通草稿，不直接发送外部消息。" },
  { id: "follow_up", name: "外贸跟进 Agent", description: "整理跟进节奏、沟通摘要和下一步行动建议。", capabilities: ["沟通摘要", "跟进计划", "行动建议"], detail: "整理客户沟通上下文，提出下一步跟进建议，具体外部操作仍遵循审批规则。" },
  { id: "trade_compliance", name: "贸易合规 Agent", description: "辅助核查贸易限制、HS 编码和国家合规要求。", capabilities: ["贸易限制", "HS 编码", "合规核查"], detail: "辅助整理贸易合规相关信息，结果应由专业人员结合最新法规复核。" },
] as const;

export function AgentMarketPage() {
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;
    agentApi.listProfiles().then(rows => {
      if (!alive) return;
      setProfiles(rows);
      setLoadError("");
    }).catch(error => {
      if (alive) setLoadError(error instanceof Error ? error.message : "加载 Agent 目录失败。");
    });
    return () => { alive = false; };
  }, []);

  const enabledCount = agentCatalog.filter(agent => profiles.find(row => row.agent_key === agent.id)?.enabled ?? true).length;
  const visibleAgents = useMemo(() => agentCatalog.filter(agent => {
    const profile = profiles.find(row => row.agent_key === agent.id);
    const enabled = profile?.enabled ?? true;
    const matchesStatus = !statusFilter || (statusFilter === "enabled" ? enabled : !enabled);
    const matchesSearch = [agent.name, agent.description, ...agent.capabilities].join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase());
    return matchesStatus && matchesSearch;
  }), [profiles, search, statusFilter]);

  const selectedAgent = agentCatalog.find(agent => agent.id === selectedId);
  const selectedProfile = profiles.find(profile => profile.agent_key === selectedId);
  const selectedEnabled = selectedProfile?.enabled ?? true;

  const openDetails = (id: string) => {
    const profile = profiles.find(row => row.agent_key === id);
    setSelectedId(id);
    setPrompt(profile?.config?.systemPrompt ?? "");
    setNotice("");
  };

  const toggleAgent = async (id: string) => {
    const current = profiles.find(row => row.agent_key === id);
    const enabled = current?.enabled ?? true;
    setBusy(true);
    setNotice("");
    try {
      const agent = agentCatalog.find(item => item.id === id);
      const saved = await agentApi.saveProfile(id, {
        enabled: !enabled,
        config: current?.config ?? { systemPrompt: "", description: agent?.description ?? "" },
      });
      setProfiles(rows => [...rows.filter(row => row.agent_key !== id), saved]);
      setNotice((agent?.name ?? "Agent") + (saved.enabled ? " 已启用。" : " 已停用。"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "更新 Agent 状态失败。");
    } finally {
      setBusy(false);
    }
  };

  const savePrompt = async () => {
    if (!selectedAgent || !selectedId) return;
    setBusy(true);
    setNotice("");
    try {
      const saved = await agentApi.saveProfile(selectedId, {
        enabled: selectedEnabled,
        config: { ...(selectedProfile?.config ?? {}), systemPrompt: prompt.trim(), description: selectedAgent.description },
      });
      setProfiles(rows => [...rows.filter(row => row.agent_key !== selectedId), saved]);
      setPrompt(saved.config?.systemPrompt ?? prompt.trim());
      setNotice("专业指令已保存。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存专业指令失败。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tp-agent-market-page">
      <PageControlPanel
        eyebrow="TRADEPILOT / AGENT"
        title="Agent 市场"
        description="发现、查看和管理 TradePilot 的业务智能体。"
        actions={<Button onClick={() => { window.location.href = "/agent/connections"; }}><Plug size={16} />接入外部 Agent</Button>}
      />

      <section className="tp-agent-market-summary" aria-label="Agent 目录概览">
        <div><strong>{agentCatalog.length}</strong><span>内置 Agent</span></div>
        <div><strong>{enabledCount}</strong><span>已启用</span></div>
        <div><strong>REST API · MCP · Webhook</strong><span>外部接入协议</span></div>
      </section>

      <section className="tp-agent-market-controls" aria-label="搜索和筛选 Agent">
        <div className="tp-agent-market-search">
          <label htmlFor="agent-market-search">搜索 Agent</label>
          <Input id="agent-market-search" value={search} onChange={event => setSearch(event.currentTarget.value)} placeholder="按名称、业务能力或用途搜索" />
        </div>
        <div className="tp-agent-market-status">
          <label htmlFor="agent-market-status">启用状态</label>
          <Combobox value={statusFilter} onValueChange={setStatusFilter} placeholder="全部状态" searchPlaceholder="输入状态名称" filterable options={[
            { value: "", label: "全部状态" }, { value: "enabled", label: "已启用" }, { value: "disabled", label: "已停用" },
          ]} />
        </div>
        <p className="tp-agent-market-result-count">{visibleAgents.length} 个 Agent</p>
      </section>

      {loadError && <p className="tp-agent-market-feedback" role="alert">{loadError}</p>}
      <section className="tp-agent-market-catalog" aria-label="内置 Agent 目录">
        <div className="tp-agent-market-section-heading"><div><h2>内置 Agent</h2><p>选择一个 Agent 查看能力、执行边界和配置。</p></div></div>
        <div className="tp-agent-market-grid">
          {visibleAgents.map(agent => {
            const profile = profiles.find(row => row.agent_key === agent.id);
            const enabled = profile?.enabled ?? true;
            return (
              <Card key={agent.id} className="tp-agent-market-card">
                <CardContent>
                  <div className="tp-agent-market-card-heading">
                    <span className="tp-agent-market-icon"><Bot size={20} /></span>
                    <Badge variant={enabled ? "success" : "outline"}>{enabled ? "已启用" : "已停用"}</Badge>
                  </div>
                  <h3>{agent.name}</h3>
                  <p className="tp-agent-market-card-description">{agent.description}</p>
                  <div className="tp-agent-market-capabilities">{agent.capabilities.map(capability => <span key={capability}>{capability}</span>)}</div>
                  <div className="tp-agent-market-card-actions">
                    <Button size="sm" kind="tertiary" variant="outline" onClick={() => openDetails(agent.id)}><Edit size={14} />查看详情</Button>
                    <Button size="sm" kind={enabled ? "tertiary" : "primary"} variant={enabled ? "outline" : "default"} disabled={busy} onClick={() => void toggleAgent(agent.id)}>{enabled ? "停用" : "启用"}</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {visibleAgents.length === 0 && <div className="tp-agent-market-empty">没有匹配的 Agent，请调整搜索或筛选条件。</div>}
        </div>
      </section>

      {selectedAgent && (
        <section className="tp-agent-market-detail" aria-label="Agent 详情与配置">
          <div className="tp-agent-market-section-heading">
            <div><h2>{selectedAgent.name}</h2><p>Agent 详情与专业指令配置</p></div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>关闭</Button>
          </div>
          <div className="tp-agent-market-detail-grid">
            <div><h3>业务能力</h3><p>{selectedAgent.detail}</p><div className="tp-agent-market-capabilities">{selectedAgent.capabilities.map(capability => <span key={capability}>{capability}</span>)}</div></div>
            <div><h3>执行边界</h3><p>搜索、研究和分析按系统预算策略执行；发送消息、批量导入及其他外部写操作仍需人工审批。</p></div>
          </div>
          <div className="tp-agent-market-prompt">
            <label htmlFor="agent-system-prompt">专业指令（System Prompt）</label>
            <Textarea id="agent-system-prompt" rows={7} value={prompt} onChange={event => setPrompt(event.currentTarget.value)} placeholder="定义该 Agent 的专业职责、分析规则和输出要求。" />
            <div className="tp-agent-market-prompt-actions"><span>修改后需明确保存，未保存内容不会自动提交。</span><Button disabled={busy} onClick={() => void savePrompt()}><Checkmark size={16} />保存专业指令</Button></div>
          </div>
        </section>
      )}

      <section className="tp-agent-market-external">
        <div><h2>外部 Agent</h2><p>仅展示已登记并通过协议验证的连接。尚未接入的服务不会作为可用 Agent 展示。</p></div>
        <div className="tp-agent-market-external-empty"><Plug size={22} /><div><strong>外部 Agent 通过连接管理接入</strong><p>支持 REST API、MCP 和 Webhook。连接验证通过后，再纳入可用服务目录。</p></div><Button kind="tertiary" variant="outline" onClick={() => { window.location.href = "/agent/connections"; }}>管理连接 <ArrowRight size={16} /></Button></div>
      </section>
      {notice && <p className="tp-agent-market-feedback" role="status">{notice}</p>}
    </div>
  );
}
