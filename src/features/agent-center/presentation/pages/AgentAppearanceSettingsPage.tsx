import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Column,
  Dropdown,
  Grid,
  Heading,
  InlineNotification,
  Section,
  Stack,
  Tag,
  Tile,
} from "@carbon/react";
import { Reset as RotateCcw, Save, MagicWand as Sparkles } from "@carbon/icons-react";
import { CharacterMark, COLOR_IDS, SHAPE_IDS, type ColorId, type ShapeId, type CharacterState } from "@aora-bot/react";
import { PageHeader } from "@/components/common";
import {
  AGENT_APPEARANCE_PROFILES,
  DEFAULT_AGENT_APPEARANCE,
  DEFAULT_AGENT_APPEARANCE_CONFIG,
  type AgentAppearance,
  type AgentAppearanceConfig,
} from "../../domain/appearance";
import { loadAgentAppearanceConfig, saveAgentAppearanceConfig } from "../hooks/useAgentAppearance";
import "./agent-appearance-settings.scss";

const styles = [
  { id: "vector", label: "矢量", variants: ["soft", "sticker", "outline", "glass", "neon"] },
  { id: "pixel", label: "像素", variants: ["crisp", "dot", "block"] },
  { id: "kaomoji", label: "颜文字", variants: ["plain", "bubble"] },
] as const;

const faces = [
  { id: "cute", label: "可爱脸" }, { id: "eyes", label: "眼睛脸" },
  { id: "line", label: "线条脸" }, { id: "symbol", label: "符号脸" },
  { id: "button", label: "按钮脸" }, { id: "capsule", label: "胶囊脸" },
  { id: "brow", label: "眉眼脸" }, { id: "glossy", label: "亮晶脸" },
  { id: "sparkle", label: "星光脸" }, { id: "shades", label: "墨镜脸" },
  { id: "droopy", label: "慵懒脸" }, { id: "bigmouth", label: "大嘴脸" },
  { id: "pie", label: "派脸" }, { id: "screen", label: "屏幕脸" },
  { id: "teardrop", label: "泪滴脸" }, { id: "specs", label: "眼镜脸" },
] as const;

const SAFE_SHAPES = SHAPE_IDS.filter((shape) => !["blob", "gem"].includes(shape));
const states: Array<{ id: CharacterState; label: string }> = [
  { id: "idle", label: "待机" }, { id: "thinking", label: "思考" },
  { id: "searching", label: "搜索" }, { id: "working", label: "执行" },
  { id: "happy", label: "开心" }, { id: "celebrate", label: "完成" },
  { id: "sleeping", label: "休眠" }, { id: "alerting", label: "异常提醒" },
];

export function AgentAppearanceSettingsPage() {
  const [config, setConfig] = useState<AgentAppearanceConfig>(DEFAULT_AGENT_APPEARANCE_CONFIG);
  const [activeAgent, setActiveAgent] = useState("default");
  const [previewState, setPreviewState] = useState<CharacterState>("idle");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState<"success" | "error" | "info">("info");

  const current = useMemo(
    () => activeAgent === "default" ? config.default : config.agents[activeAgent] ?? config.default,
    [activeAgent, config],
  );
  const setCurrent = (next: AgentAppearance) => setConfig((old) =>
    activeAgent === "default"
      ? { ...old, default: next }
      : { ...old, agents: { ...old.agents, [activeAgent]: next } },
  );

  useEffect(() => {
    let alive = true;
    void loadAgentAppearanceConfig().then((value) => {
      if (alive) setConfig(value);
    });
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setBusy(true);
    setNotice("");
    try {
      const saved = await saveAgentAppearanceConfig(config);
      setConfig(saved);
      setNoticeKind("success");
      setNotice("形象配置已保存，所有 Agent 入口已同步更新。");
    } catch (error) {
      setNoticeKind("error");
      setNotice(error instanceof Error ? error.message : "保存形象配置失败。");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (activeAgent === "default") {
      setConfig((old) => ({ ...old, default: DEFAULT_AGENT_APPEARANCE }));
    } else {
      setConfig((old) => {
        const agents = { ...old.agents };
        delete agents[activeAgent];
        return { ...old, agents };
      });
    }
    setNoticeKind("info");
    setNotice("已恢复默认预览，请保存后应用。");
  };

  const variants = styles.find((item) => item.id === current.styleId)?.variants ?? styles[0].variants;
  const activeAgentName = activeAgent === "default"
    ? "全局默认 Agent"
    : AGENT_APPEARANCE_PROFILES.find((item) => item.id === activeAgent)?.name ?? "Agent";

  return (
    <main className="tp-agent-appearance-page">
      <Stack gap={7}>
        <PageHeader
          breadcrumbs={[{ label: "系统设置", href: "/settings/integrations" }, { label: "Agent 形象设计" }]}
          title="Agent 形象设计"
          actions={<Tag type="green">实时预览</Tag>}
        />

        <Grid fullWidth className="tp-agent-appearance-grid">
          <Column sm={4} md={8} lg={10} xlg={10} max={10}>
            <Stack gap={6}>
              <Tile className="tp-agent-appearance-tile">
                <Stack gap={5}>
                  <Section level={2}>
                    <Heading className="cds--type-productive-heading-03">选择要设计的 Agent</Heading>
                  </Section>
                  <div className="tp-agent-appearance-choices">
                    <Button size="sm" kind={activeAgent === "default" ? "primary" : "tertiary"} aria-pressed={activeAgent === "default"} onClick={() => setActiveAgent("default")}>
                      全局默认形象
                    </Button>
                    {AGENT_APPEARANCE_PROFILES.map((item) => (
                      <Button key={item.id} size="sm" kind={activeAgent === item.id ? "primary" : "tertiary"} aria-pressed={activeAgent === item.id} onClick={() => setActiveAgent(item.id)}>
                        {item.name}
                      </Button>
                    ))}
                  </div>
                </Stack>
              </Tile>

              <Tile className="tp-agent-appearance-tile">
                <Stack gap={5}>
                  <Section level={2}>
                    <Heading className="cds--type-productive-heading-03">角色与配色</Heading>
                  </Section>
                  <p className="cds--type-body-compact-01 tp-agent-appearance-description">
                    选择角色造型与主色。修改会同步到预览，保存后在 Agent 菜单、工作台和 Agent 市场中统一显示。
                  </p>
                  <Grid narrow>
                    <Column sm={4} md={4} lg={8}>
                      <Dropdown
                        id="agent-appearance-shape"
                        titleText="角色造型"
                        label="选择角色造型"
                        items={[...SAFE_SHAPES]}
                        selectedItem={current.shape}
                        itemToString={(item) => item ?? ""}
                        onChange={({ selectedItem }) => {
                          if (selectedItem) setCurrent({ ...current, shape: selectedItem });
                        }}
                      />
                    </Column>
                    <Column sm={4} md={4} lg={8}>
                      <Dropdown
                        id="agent-appearance-color"
                        titleText="主色"
                        label="选择主色"
                        items={[...COLOR_IDS]}
                        selectedItem={current.color}
                        itemToString={(item) => item ?? ""}
                        onChange={({ selectedItem }) => {
                          if (selectedItem) setCurrent({ ...current, color: selectedItem });
                        }}
                      />
                    </Column>
                  </Grid>
                </Stack>
              </Tile>

              <Tile className="tp-agent-appearance-tile">
                <Stack gap={5}>
                  <Section level={2}>
                    <Heading className="cds--type-productive-heading-03">画风与脸型</Heading>
                  </Section>
                  <Stack gap={3}>
                    <p className="cds--type-label-01">画风</p>
                    <div className="tp-agent-appearance-choices">
                      {styles.map((style) => (
                        <Button key={style.id} size="sm" kind={current.styleId === style.id ? "primary" : "tertiary"} aria-pressed={current.styleId === style.id} onClick={() => setCurrent({ ...current, styleId: style.id, variant: style.variants[0] })}>
                          {style.label}
                        </Button>
                      ))}
                    </div>
                  </Stack>
                  <Stack gap={3}>
                    <p className="cds--type-label-01">画风变体</p>
                    <div className="tp-agent-appearance-choices">
                      {variants.map((variant) => (
                        <Button key={variant} size="sm" kind={current.variant === variant ? "secondary" : "tertiary"} aria-pressed={current.variant === variant} onClick={() => setCurrent({ ...current, variant })}>
                          {variant}
                        </Button>
                      ))}
                    </div>
                  </Stack>
                  <Stack gap={3}>
                    <p className="cds--type-label-01">脸型</p>
                    <div className="tp-agent-appearance-choices">
                      {faces.map((face) => (
                        <Button key={face.id} size="sm" kind={current.face === face.id ? "secondary" : "tertiary"} aria-pressed={current.face === face.id} onClick={() => setCurrent({ ...current, face: face.id })}>
                          {face.label}
                        </Button>
                      ))}
                    </div>
                  </Stack>
                </Stack>
              </Tile>

              <Tile className="tp-agent-appearance-tile">
                <Stack gap={4}>
                  <Section level={2}>
                    <Heading className="cds--type-productive-heading-03">动画状态预览</Heading>
                  </Section>
                  <div className="tp-agent-appearance-choices">
                    {states.map((item) => (
                      <Button key={item.id} size="sm" kind={previewState === item.id ? "secondary" : "tertiary"} aria-pressed={previewState === item.id} onClick={() => setPreviewState(item.id)}>
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </Stack>
              </Tile>
            </Stack>
          </Column>

          <Column sm={4} md={8} lg={6} xlg={6} max={6}>
            <Stack gap={5} className="tp-agent-appearance-preview-column">
              <Tile className="tp-agent-appearance-preview">
                <Stack gap={5} className="tp-agent-appearance-preview-content">
                  <div className="agent-avatar-preview">
                    <CharacterMark
                      shape={current.shape as ShapeId}
                      color={current.color as ColorId}
                      styleId={current.styleId}
                      variant={current.variant as never}
                      face={current.face}
                      state={previewState}
                      sizePx={156}
                      autoPause
                      entryEffects={false}
                      seed={"tradepilot-preview-" + activeAgent}
                    />
                  </div>
                  <Stack gap={2} className="tp-agent-appearance-preview-copy">
                    <Heading className="cds--type-productive-heading-03">{activeAgentName}</Heading>
                    <p className="cds--type-body-compact-01">
                      正在预览：{states.find((item) => item.id === previewState)?.label}
                    </p>
                    <Tag type="blue">{current.shape} · {current.styleId} · {current.face}</Tag>
                  </Stack>
                </Stack>
              </Tile>

              <div className="tp-agent-appearance-actions">
                <Button className="tp-agent-appearance-save" renderIcon={Save} disabled={busy} onClick={() => void save()}>
                  {busy ? "保存中…" : "保存形象"}
                </Button>
                <Button kind="tertiary" hasIconOnly renderIcon={RotateCcw} iconDescription="恢复默认形象" onClick={reset} />
              </div>

              {notice ? (
                <InlineNotification
                  kind={noticeKind}
                  title={noticeKind === "error" ? "保存失败" : noticeKind === "success" ? "保存成功" : "提示"}
                  subtitle={notice}
                  lowContrast
                  hideCloseButton
                />
              ) : null}

              <Tile className="tp-agent-appearance-attribution">
                <Stack gap={3}>
                  <div className="tp-agent-appearance-attribution-heading">
                    <Sparkles size={16} aria-hidden="true" />
                    <span className="cds--type-label-01">Powered by Aora Bot</span>
                  </div>
                  <p className="cds--type-helper-text-01">
                    角色预览与动画由 Aora Bot 提供。感谢 sam70361 的开源创作。
                  </p>
                  <a href="https://github.com/sam70361/aora-bot" target="_blank" rel="noreferrer">
                    查看 Aora Bot 项目与授权
                  </a>
                </Stack>
              </Tile>
            </Stack>
          </Column>
        </Grid>
      </Stack>
    </main>
  );
}
