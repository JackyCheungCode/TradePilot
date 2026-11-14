import { useEffect, useMemo, useState } from "react";
import { Button, Column, Dropdown, Grid, Heading, InlineNotification, Section, Stack, Tag, Tile } from "@carbon/react";
import { Reset as RotateCcw, Save } from "@carbon/icons-react";
import { CharacterMark, COLOR_IDS, SHAPE_IDS, zhCN, type ColorId, type ShapeId, type CharacterState } from "@aora-bot/react";
import { PageHeader } from "@/components/common";
import { AGENT_APPEARANCE_PROFILES, DEFAULT_AGENT_APPEARANCE, DEFAULT_AGENT_APPEARANCE_CONFIG, type AgentAppearance, type AgentAppearanceConfig } from "../../domain/appearance";
import { loadAgentAppearanceConfig, saveAgentAppearanceConfig } from "../hooks/useAgentAppearance";
import "./agent-appearance-settings.scss";

const styles = [
  { id: "vector", label: "矢量", variants: ["soft", "sticker", "outline", "glass", "neon"] },
  { id: "pixel", label: "像素", variants: ["crisp", "dot", "block"] },
  { id: "kaomoji", label: "颜文字", variants: ["plain", "bubble"] },
] as const;
const faces = [
  { id: "cute", label: "可爱脸" }, { id: "eyes", label: "眼睛脸" }, { id: "line", label: "线条脸" },
  { id: "symbol", label: "符号脸" }, { id: "button", label: "按钮脸" }, { id: "capsule", label: "胶囊脸" },
  { id: "brow", label: "眉眼脸" }, { id: "glossy", label: "亮晶脸" }, { id: "sparkle", label: "星光脸" },
  { id: "shades", label: "墨镜脸" }, { id: "droopy", label: "慵懒脸" }, { id: "bigmouth", label: "大嘴脸" },
  { id: "pie", label: "派脸" }, { id: "screen", label: "屏幕脸" }, { id: "teardrop", label: "泪滴脸" }, { id: "specs", label: "眼镜脸" },
] as const;
const states: Array<{ id: CharacterState; label: string }> = [
  { id: "idle", label: "待机" }, { id: "thinking", label: "思考" }, { id: "searching", label: "搜索" },
  { id: "working", label: "执行" }, { id: "happy", label: "开心" }, { id: "celebrate", label: "完成" },
  { id: "sleeping", label: "休眠" }, { id: "alerting", label: "异常提醒" },
];
const shapeLabels: Record<string, string> = { mochi: "团子", bot: "机器人", cat: "猫咪", bear: "小熊", rabbit: "兔子", dog: "小狗", blob: "软团", gem: "宝石" };
const colorLabels: Record<string, string> = { cream: "奶油白", blue: "蓝色", pink: "粉色", purple: "紫色", green: "绿色", yellow: "黄色", orange: "橙色", red: "红色", black: "黑色", white: "白色" };
const readable = (value: string, labels: Record<string, string> = {}) => labels[value] ?? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const equalConfig = (a: AgentAppearanceConfig, b: AgentAppearanceConfig) => JSON.stringify(a) === JSON.stringify(b);

export function AgentAppearanceSettingsPage() {
  const [config, setConfig] = useState<AgentAppearanceConfig>(DEFAULT_AGENT_APPEARANCE_CONFIG);
  const [savedConfig, setSavedConfig] = useState<AgentAppearanceConfig>(DEFAULT_AGENT_APPEARANCE_CONFIG);
  const [activeAgent, setActiveAgent] = useState("default");
  const [previewState, setPreviewState] = useState<CharacterState>("idle");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState<"success" | "error" | "info">("info");
  const current = useMemo(() => activeAgent === "default" ? config.default : config.agents[activeAgent] ?? config.default, [activeAgent, config]);
  const isInherited = activeAgent !== "default" && !config.agents[activeAgent];
  const dirty = !equalConfig(config, savedConfig);
  const activeName = activeAgent === "default" ? "全局默认形象" : AGENT_APPEARANCE_PROFILES.find((item) => item.id === activeAgent)?.name ?? "Agent";
  const variants = styles.find((item) => item.id === current.styleId)?.variants ?? styles[0].variants;
  const agentOptions = [{ id: "default", name: "全局默认形象" }, ...AGENT_APPEARANCE_PROFILES.map(({ id, name }) => ({ id, name }))];
  const selectedAgent = agentOptions.find((item) => item.id === activeAgent) ?? agentOptions[0];
  const setCurrent = (next: AgentAppearance) => {
    setConfig((old) => activeAgent === "default" ? { ...old, default: next } : { ...old, agents: { ...old.agents, [activeAgent]: next } });
    setNotice("");
  };

  useEffect(() => {
    let alive = true;
    void loadAgentAppearanceConfig().then((value) => {
      if (!alive) return;
      setConfig(value); setSavedConfig(value);
    }).catch((error: unknown) => {
      if (alive) setLoadError(error instanceof Error ? error.message : "无法加载形象配置，请重试。");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const retryLoad = () => {
    setLoading(true); setLoadError("");
    void loadAgentAppearanceConfig().then((value) => { setConfig(value); setSavedConfig(value); })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "无法加载形象配置，请重试。"))
      .finally(() => setLoading(false));
  };
  const save = async () => {
    setBusy(true); setNotice("");
    try {
      const saved = await saveAgentAppearanceConfig(config);
      setConfig(saved); setSavedConfig(saved); setNoticeKind("success");
      setNotice(activeAgent === "default"
        ? "全局默认形象已保存。未设置独立形象的 Agent 将继承新配置，已有独立配置不会被覆盖。"
        : `${activeName} 的独立形象已保存，不会影响其他 Agent。`);
    } catch (error) {
      setNoticeKind("error"); setNotice(error instanceof Error ? error.message : "保存形象配置失败，请重试。");
    } finally { setBusy(false); }
  };
  const reset = () => {
    if (activeAgent === "default") {
      setConfig((old) => ({ ...old, default: DEFAULT_AGENT_APPEARANCE }));
      setNotice("全局默认形象已恢复为系统初始值，保存后生效。");
    } else {
      setConfig((old) => { const agents = { ...old.agents }; delete agents[activeAgent]; return { ...old, agents }; });
      setNotice(`${activeName} 将改为继承全局默认形象，保存后生效。`);
    }
    setNoticeKind("info");
  };

  const preview = (
    <Stack gap={4} className="tp-agent-appearance-preview-content">
      <div className="tp-agent-appearance-preview-art" role="img" aria-label={`${activeName}角色预览`}>
        <CharacterMark shape={current.shape as ShapeId} color={current.color as ColorId} styleId={current.styleId}
          variant={current.variant as never} face={current.face} state={previewState} sizePx={156} autoPause entryEffects={false}
          seed={"tradepilot-preview-" + activeAgent} />
      </div>
      <Stack gap={2} className="tp-agent-appearance-preview-copy">
        <Heading className="cds--type-productive-heading-03">{activeName}</Heading>
        <p className="cds--type-body-compact-01">{states.find((item) => item.id === previewState)?.label}状态 · {localized("shape", current.shape)} · {localized("color", current.color)}</p>
        <Tag type={isInherited ? "green" : "blue"}>{isInherited ? "继承全局默认" : activeAgent === "default" ? "全局默认配置" : "独立配置"}</Tag>
      </Stack>
    </Stack>
  );

  return (
    <main className="tp-agent-appearance-page">
      <Stack gap={6}>
        <PageHeader breadcrumbs={[{ label: "系统设置", href: "/settings/integrations" }, { label: "Agent 形象设计" }]}
          title="Agent 形象设计" actions={<Tag type={dirty ? "blue" : "gray"}>{dirty ? "有未保存更改" : "配置已保存"}</Tag>} />
        {loadError ? <InlineNotification kind="error" title="形象配置加载失败" subtitle={loadError} lowContrast hideCloseButton /> : null}
        <Grid fullWidth className="tp-agent-appearance-grid">
          <Column sm={4} md={8} lg={6} xlg={6} max={6} className="tp-agent-appearance-preview-column">
            <Stack gap={4}>
              <Tile className="tp-agent-appearance-preview">
                <Stack gap={4}>
                  <Section level={2}><Heading className="cds--type-productive-heading-03">实时预览</Heading></Section>
                  {preview}
                  <Dropdown id="agent-appearance-state" titleText="动画状态" label="选择预览状态" items={states}
                    selectedItem={states.find((item) => item.id === previewState) ?? states[0]} itemToString={(item) => item?.label ?? ""}
                    onChange={({ selectedItem }) => { if (selectedItem) setPreviewState(selectedItem.id); }} />
                </Stack>
              </Tile>
              <div className="tp-agent-appearance-actions">
                <Button className="tp-agent-appearance-save" renderIcon={Save} disabled={busy || loading || Boolean(loadError) || !dirty} onClick={() => void save()}>
                  {busy ? "保存中…" : "保存形象"}
                </Button>
                <Button kind="tertiary" renderIcon={RotateCcw} disabled={busy || loading} onClick={reset}>
                  {activeAgent === "default" ? "恢复系统默认" : "恢复全局默认"}
                </Button>
              </div>
              {notice ? <InlineNotification kind={noticeKind} title={noticeKind === "error" ? "操作失败" : noticeKind === "success" ? "保存成功" : "配置提示"}
                subtitle={notice} lowContrast hideCloseButton /> : null}
            </Stack>
          </Column>
          <Column sm={4} md={8} lg={10} xlg={10} max={10} className="tp-agent-appearance-editor-column">
            <Stack gap={5}>
              <Tile className="tp-agent-appearance-tile">
                <Stack gap={4}>
                  <Section level={2}><Heading className="cds--type-productive-heading-03">配置对象</Heading></Section>
                  <Dropdown id="agent-appearance-target" disabled={loading || Boolean(loadError) || busy} titleText="选择要设计的 Agent" label="选择 Agent" items={agentOptions}
                    selectedItem={selectedAgent} itemToString={(item) => item?.name ?? ""}
                    onChange={({ selectedItem }) => { if (selectedItem) { setActiveAgent(selectedItem.id); setNotice(""); } }} />
                  <p className="cds--type-helper-text-01 tp-agent-appearance-help">
                    全局默认会被未设置独立形象的 Agent 继承；为某个 Agent 设置独立形象后，该 Agent 不再跟随全局默认变化。
                  </p>
                  {isInherited ? <Tag type="green">当前 Agent 正在继承全局默认</Tag> : null}
                </Stack>
              </Tile>
              <Tile className="tp-agent-appearance-tile">
                <Stack gap={5}>
                  <Section level={2}><Heading className="cds--type-productive-heading-03">角色与配色</Heading></Section>
                  <Grid narrow className="tp-agent-appearance-field-grid">
                    <Column sm={4} md={4} lg={8}>
                      <Dropdown id="agent-appearance-shape" disabled={loading || Boolean(loadError) || busy} titleText="角色造型" label="选择角色造型" items={[...SHAPE_IDS]}
                        selectedItem={current.shape} itemToString={(item) => item ? localized("shape", item) : ""}
                        onChange={({ selectedItem }) => { if (selectedItem) setCurrent({ ...current, shape: selectedItem }); }} />
                    </Column>
                    <Column sm={4} md={4} lg={8}>
                      <Dropdown id="agent-appearance-color" disabled={loading || Boolean(loadError) || busy} titleText="主色" label="选择主色" items={[...COLOR_IDS]}
                        selectedItem={current.color} itemToString={(item) => item ? localized("color", item) : ""}
                        onChange={({ selectedItem }) => { if (selectedItem) setCurrent({ ...current, color: selectedItem }); }} />
                    </Column>
                  </Grid>
                </Stack>
              </Tile>
              <Tile className="tp-agent-appearance-tile">
                <Stack gap={5}>
                  <Section level={2}><Heading className="cds--type-productive-heading-03">画风与脸型</Heading></Section>
                  <Stack gap={3}>
                    <p className="cds--type-label-01">画风</p>
                    <div className="tp-agent-appearance-choices">
                      {styles.map((style) => <Button key={style.id} size="sm" kind={current.styleId === style.id ? "primary" : "tertiary"}
                        aria-pressed={current.styleId === style.id} disabled={loading || Boolean(loadError) || busy} onClick={() => setCurrent({ ...current, styleId: style.id, variant: style.variants[0] })}>{style.label}</Button>)}
                    </div>
                  </Stack>
                  <Dropdown id="agent-appearance-variant" disabled={loading || Boolean(loadError) || busy} titleText="画风变体" label="选择画风变体" items={[...variants]}
                    selectedItem={current.variant} itemToString={(item) => item ?? ""}
                    onChange={({ selectedItem }) => { if (selectedItem) setCurrent({ ...current, variant: selectedItem }); }} />
                  <Dropdown id="agent-appearance-face" disabled={loading || Boolean(loadError) || busy} titleText="脸型" label="选择脸型" items={[...faces]}
                    selectedItem={faces.find((item) => item.id === current.face) ?? faces[0]} itemToString={(item) => item?.label ?? ""}
                    onChange={({ selectedItem }) => { if (selectedItem) setCurrent({ ...current, face: selectedItem.id }); }} />
                </Stack>
              </Tile>
              <Tile className="tp-agent-appearance-attribution">
                <Stack gap={2}>
                  <p className="cds--type-label-01">角色组件与授权</p>
                  <p className="cds--type-helper-text-01">角色预览与动画由 Aora Bot 提供。感谢 sam70361 的开源创作。</p>
                  <a href="https://github.com/sam70361/aora-bot" target="_blank" rel="noreferrer">查看 Aora Bot 项目与授权</a>
                </Stack>
              </Tile>
            </Stack>
          </Column>
        </Grid>
        {loading ? <InlineNotification kind="info" title="正在加载形象配置" subtitle="请稍候，加载完成后即可编辑。" lowContrast hideCloseButton /> : null}
        {loadError ? <Button kind="tertiary" onClick={retryLoad} disabled={loading}>重新加载配置</Button> : null}
      </Stack>
    </main>
  );
}
