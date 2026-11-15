import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionItem,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Checkbox,
  Column,
  ComboBox,
  Grid,
  Heading,
  MultiSelect,
  NumberInput,
  Section,
  Search as CarbonSearch,
  Stack,
  Tag,
  TextInput,
  Tile,
} from "@carbon/react";
import {
  Add,
  Building,
  Translate as Language,
  Map,
  Play,
  SettingsAdjust,
  TrashCan,
  UserMultiple,
} from "@carbon/icons-react";
import { Notify } from "@/components/common";
import { CountrySelect } from "../components/CountrySelect";
import { RegionCityPicker } from "../components/RegionCityPicker";
import { discoveryApi } from "../../infrastructure/discovery-api";
import type { DiscoveryLog, DiscoveryRun } from "../../domain/model";
import { mapOsmTags, type OsmTagRule } from "../osm-mapping";
import { BUSINESS_TYPE_OPTIONS, mapBusinessTypeOsmTags } from "../business-types";
import { DEEPL_TARGET_LANGUAGES, defaultDeepLTargetLanguage } from "../deepl-languages";
import { translateDiscoveryKeyword } from "../../infrastructure/translation-api";
import { MapLocalTaskExecutionPanel } from "../components/MapLocalTaskExecutionPanel";

type Provider = "google_maps" | "openstreetmap";
type LanguageOption = { id: string; text: string };

export function MapLocalDiscoveryPage() {
  const [country, setCountry] = useState("US");
  const [providers, setProviders] = useState<Provider[]>(["google_maps", "openstreetmap"]);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("electrical equipment distributor");
  const [businessTypes, setBusinessTypes] = useState<string[]>(["distributor"]);
  const [filters, setFilters] = useState({ minRating: "", openNow: false, requireWebsite: false, requirePhone: false });
  const [osmTags, setOsmTags] = useState<OsmTagRule[]>(() => mapBusinessTypeOsmTags(["distributor"]));
  const [limit, setLimit] = useState(100);
  const [run, setRun] = useState<DiscoveryRun | null>(null);
  const [logs, setLogs] = useState<DiscoveryLog[]>([]);
  const [starting, setStarting] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState(defaultDeepLTargetLanguage("US"));
  const [translation, setTranslation] = useState<{ source: string; translated: string; detected?: string } | null>(null);
  const [translationApplied, setTranslationApplied] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!run || !["queued", "running"].includes(run.status)) return;
    let active = true;
    const poll = async () => {
      try {
        const latest = await discoveryApi.getRun(run.id);
        if (!active) return;
        setRun(latest);
        setLogs(latest.logs ?? []);
      } catch {
        // Retry on the next polling interval.
      }
    };
    void poll();
    const timer = window.setInterval(poll, 2200);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [run?.id, run?.status]);

  useEffect(() => {
    setOsmTags(businessTypes.length ? mapBusinessTypeOsmTags(businessTypes) : mapOsmTags(query));
  }, [query, businessTypes]);

  const translate = async () => {
    if (!query.trim()) return;
    setTranslating(true);
    try {
      const result = await translateDiscoveryKeyword(query.trim(), targetLanguage);
      setTranslation({ source: query.trim(), translated: result.translatedText, detected: result.detectedSourceLanguage });
      setTranslationApplied(false);
      Notify.toast({ kind: "success", title: "关键词翻译完成" });
    } catch (error) {
      Notify.toast({ kind: "error", title: error instanceof Error ? error.message : "DeepL 翻译失败" });
    } finally {
      setTranslating(false);
    }
  };

  const start = async () => {
    if (!country || !query.trim()) return;
    const validTags = osmTags.filter((tag) => /^[a-z0-9_:-]{1,64}$/i.test(tag.key) && /^[a-z0-9_:-]{1,100}$/i.test(tag.value));
    if (providers.includes("openstreetmap") && !validTags.length) return;
    setStarting(true);
    try {
      const created = await discoveryApi.start({
        countries: [country],
        state: state || undefined,
        city: city || undefined,
        query: query.trim(),
        originalQuery: translationApplied && translation ? translation.source : undefined,
        translatedQuery: translationApplied && translation ? translation.translated : undefined,
        targetLanguage: translationApplied ? targetLanguage : undefined,
        businessTypes,
        filters: {
          minRating: providers.includes("google_maps") && filters.minRating ? Number(filters.minRating) : undefined,
          openNow: providers.includes("google_maps") && filters.openNow,
          requireWebsite: filters.requireWebsite,
          requirePhone: filters.requirePhone,
        },
        limitPerCountry: Math.max(1, Math.min(500, Number(limit) || 100)),
        providers,
        osmTags: providers.includes("openstreetmap") ? validTags.map(({ key, value }) => ({ key, value })) : undefined,
      });
      setRun(created);
      setLogs([]);
      Notify.toast({ kind: "success", title: "搜索任务已创建", subtitle: created.taskCode ?? created.id });
    } catch (error) {
      Notify.toast({ kind: "error", title: error instanceof Error ? error.message : "任务创建失败" });
    } finally {
      setStarting(false);
    }
  };

  const updateOsmTag = (index: number, raw: string) => {
    const [key = "", value = ""] = raw.split("=", 2);
    setOsmTags((current) => current.map((tag, itemIndex) => itemIndex === index ? { ...tag, key: key.trim(), value: (value ?? "").trim() } : tag));
  };

  const addOsmTag = () => setOsmTags((current) => [...current, {
    key: "shop",
    value: "",
    label: "自定义标签",
    match: "related",
    reason: "用户自定义 OSM 标签",
  }]);

  const running = Boolean(run && ["queued", "running"].includes(run.status));
  const languageItems: LanguageOption[] = DEEPL_TARGET_LANGUAGES.map((item) => ({ id: item.code, text: item.label }));
  const selectedLanguage = languageItems.find((item) => item.id === targetLanguage) ?? null;
  const businessTypeItems = BUSINESS_TYPE_OPTIONS.map((item) => ({ id: item.id, text: item.label }));
  const selectedBusinessTypes = businessTypeItems.filter((item) => businessTypes.includes(item.id));

  const toggleProvider = (provider: Provider, checked: boolean) => {
    setProviders((current) => checked
      ? [...current.filter((item) => item !== provider), provider]
      : current.filter((item) => item !== provider));
  };

  return (
    <>
      <Section level={1}>
        <Stack gap={5}>
          <Stack gap={3}>
            <Breadcrumb>
              <BreadcrumbItem href="/lead-discovery">潜客发现</BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>地图与本地商家</BreadcrumbItem>
            </Breadcrumb>
            <Heading className="cds--type-productive-heading-04">地图与本地商家</Heading>
          </Stack>
          <Stack orientation="horizontal" gap={3}>
            {providers.includes("google_maps") ? <Tag type="green">Google Maps</Tag> : null}
            {providers.includes("openstreetmap") ? <Tag type="blue">OpenStreetMap</Tag> : null}
            {!providers.length ? <Tag type="warm-gray">未选择数据来源</Tag> : null}
          </Stack>
        </Stack>
      </Section>

      <Grid>
        <Column sm={4} md={8} lg={8} xlg={8} max={8}>
          <Stack gap={7}>
            <Tile>
              <Stack gap={6}>
                <Section level={2}>
                  <Heading className="cds--type-productive-heading-03">发现条件</Heading>
                </Section>

                <Stack gap={3}>
                  <CarbonSearch
                    id="map-discovery-query"
                    labelText="企业 / 行业关键词"
                    value={query}
                    placeholder="例如：solar panel installer"
                    onChange={(event) => {
                      setQuery(event.currentTarget.value);
                      setTranslation(null);
                      setTranslationApplied(false);
                    }}
                  />
                  <Grid narrow>
                    <Column sm={4} md={4} lg={8}>
                      <Button kind="secondary" size="md" renderIcon={Language} onClick={() => void translate()} disabled={translating || !query.trim()}>
                        {translating ? "正在翻译…" : "DeepL 翻译"}
                      </Button>
                    </Column>
                    <Column sm={4} md={4} lg={8}>
                      <ComboBox
                        id="map-target-language"
                        titleText="DeepL 目标语言"
                        items={languageItems}
                        selectedItem={selectedLanguage}
                        itemToString={(item) => item?.text ?? ""}
                        onChange={({ selectedItem }) => {
                          if (translationApplied && translation) setQuery(translation.source);
                          setTargetLanguage(selectedItem?.id ?? targetLanguage);
                          setTranslation(null);
                          setTranslationApplied(false);
                        }}
                      />
                    </Column>
                  </Grid>
                  <p className="cds--type-helper-text-01">按目标国家推荐语言；无对应映射时默认英语，可自行更改。翻译会消耗 DeepL 字符额度。</p>
                  {translation ? (
                    <Stack gap={3}>
                        <Stack orientation="horizontal" gap={3}>
                          <Heading className="cds--type-productive-heading-02">翻译预览</Heading>
                          <Tag type="blue">{targetLanguage}</Tag>
                          {translation.detected ? <Tag type="gray">源语言 {translation.detected}</Tag> : null}
                        </Stack>
                        <p>{translation.translated}</p>
                        <Stack orientation="horizontal" gap={3}>
                          <Button size="md" onClick={() => { setQuery(translation.translated); setTranslationApplied(true); }}>
                            替换关键词
                          </Button>
                          <Button kind="ghost" size="md" onClick={() => {
                            if (translationApplied) setQuery(translation.source);
                            setTranslation(null);
                            setTranslationApplied(false);
                          }}>
                            保留原关键词
                          </Button>
                        </Stack>
                    </Stack>
                  ) : null}
                </Stack>

                <Stack gap={5}>
                  <Stack orientation="horizontal" gap={3}>
                    <Map size={20} aria-hidden="true" />
                    <Heading className="cds--type-productive-heading-03">目标市场</Heading>
                  </Stack>
                    <CountrySelect value={country} onChange={(next) => {
                      if (translationApplied && translation) setQuery(translation.source);
                      setCountry(next);
                      setState("");
                      setCity("");
                      setTargetLanguage(defaultDeepLTargetLanguage(next));
                      setTranslation(null);
                      setTranslationApplied(false);
                    }} />
                    <RegionCityPicker
                      countryCode={country}
                      state={state}
                      city={city}
                      onStateChange={setState}
                      onCityChange={setCity}
                    />
                </Stack>

                <Stack gap={3}>
                  <Heading className="cds--type-productive-heading-03">数据来源</Heading>
                  <Grid narrow>
                    <Column sm={4} md={4} lg={8}>
                      <Checkbox
                        id="map-provider-google"
                        labelText="Google Maps"
                        checked={providers.includes("google_maps")}
                        onChange={(event) => toggleProvider("google_maps", event.currentTarget.checked)}
                      />
                    </Column>
                    <Column sm={4} md={4} lg={8}>
                      <Checkbox
                        id="map-provider-osm"
                        labelText="OpenStreetMap"
                        checked={providers.includes("openstreetmap")}
                        onChange={(event) => toggleProvider("openstreetmap", event.currentTarget.checked)}
                      />
                    </Column>
                  </Grid>
                </Stack>

                <Stack gap={3}>
                  <Stack orientation="horizontal" gap={3}>
                    <Heading className="cds--type-productive-heading-03">业务类型</Heading>
                    <Tag type="blue">{businessTypes.length} 项已选</Tag>
                  </Stack>
                  <MultiSelect
                    id="map-business-types"
                    titleText="选择业务类型"
                    label="选择业务类型"
                    items={businessTypeItems}
                    itemToString={(item) => item?.text ?? ""}
                    selectedItems={selectedBusinessTypes}
                    onChange={({ selectedItems }) => setBusinessTypes((selectedItems ?? []).map((item) => item.id))}
                    selectionFeedback="fixed"
                  />
                  <Button kind="ghost" size="sm" onClick={() => setBusinessTypes([])}>清空选择</Button>
                </Stack>

                <Stack gap={4}>
                  <Stack orientation="horizontal" gap={3}>
                    <SettingsAdjust size={20} aria-hidden="true" />
                    <Heading className="cds--type-productive-heading-03">精准筛选条件</Heading>
                  </Stack>
                  <Grid narrow>
                    <Column sm={4} md={4} lg={8}>
                      <NumberInput
                        id="map-min-rating"
                        label="Google 最低评分"
                        min={0}
                        max={5}
                        step={0.5}
                        value={filters.minRating}
                        disabled={!providers.includes("google_maps")}
                        onChange={(_event, stateValue) => setFilters((current) => ({ ...current, minRating: String(stateValue.value ?? "") }))}
                      />
                      <p className="cds--type-helper-text-01">仅 Google Maps 支持</p>
                    </Column>
                    <Column sm={4} md={4} lg={8}>
                      <Checkbox
                        id="map-open-now"
                        labelText="仅搜索当前营业商家"
                        checked={filters.openNow}
                        disabled={!providers.includes("google_maps")}
                        onChange={(event) => setFilters((current) => ({ ...current, openNow: event.currentTarget.checked }))}
                      />
                      <p className="cds--type-helper-text-01">仅 Google Maps 支持</p>
                    </Column>
                  </Grid>
                  <Stack gap={3}>
                    <Checkbox
                      id="map-require-website"
                      labelText="必须有官网"
                      checked={filters.requireWebsite}
                      onChange={(event) => setFilters((current) => ({ ...current, requireWebsite: event.currentTarget.checked }))}
                    />
                    <Checkbox
                      id="map-require-phone"
                      labelText="必须有电话"
                      checked={filters.requirePhone}
                      onChange={(event) => setFilters((current) => ({ ...current, requirePhone: event.currentTarget.checked }))}
                    />
                  </Stack>
                </Stack>

                {providers.includes("openstreetmap") ? (
                  <Accordion>
                    <AccordionItem title="高级设置 · OpenStreetMap 标签映射">
                      <Stack gap={4}>
                        <Stack gap={2}>
                          <Heading className="cds--type-productive-heading-02">标签映射规则</Heading>
                          <p className="cds--type-body-compact-01">
                            {businessTypes.length ? "根据已选业务类型生成 OSM 标签" : "根据企业 / 行业关键词自动匹配 OSM 标签"}，可编辑后执行。
                          </p>
                          <Tag type="blue">{osmTags.filter((tag) => tag.key && tag.value).length} 条规则</Tag>
                        </Stack>
                        {osmTags.length ? osmTags.map((tag, index) => (
                          <Grid key={index} narrow>
                            <Column sm={4} md={4} lg={8}>
                              <TextInput
                                id={"map-osm-tag-" + index}
                                labelText={tag.label + " · " + tag.reason}
                                value={tag.key + "=" + tag.value}
                                onChange={(event) => updateOsmTag(index, event.currentTarget.value)}
                                placeholder="例如 shop=electrical"
                              />
                            </Column>
                            <Column sm={3} md={2} lg={4}>
                              <Tag type={tag.match === "primary" ? "green" : "gray"}>
                                {tag.match === "primary" ? "主要匹配" : "扩展匹配"}
                              </Tag>
                            </Column>
                            <Column sm={1} md={2} lg={4}>
                              <Button
                                kind="ghost"
                                size="md"
                                hasIconOnly
                                iconDescription="移除标签规则"
                                renderIcon={TrashCan}
                                onClick={() => setOsmTags((current) => current.filter((_item, itemIndex) => itemIndex !== index))}
                              />
                            </Column>
                          </Grid>
                        )) : <p className="cds--type-body-compact-01">当前关键词没有自动匹配规则，可手动添加 OSM 标签。</p>}
                        <Button kind="tertiary" size="md" renderIcon={Add} onClick={addOsmTag}>添加标签规则</Button>
                        <p className="cds--type-helper-text-01">
                          主要匹配优先；扩展匹配会增加结果覆盖面，也可能带来不相关商家。标签仅代表 OSM 地图分类，不保证该地区存在对应商家。
                        </p>
                      </Stack>
                    </AccordionItem>
                  </Accordion>
                ) : null}

                <NumberInput
                  id="map-discovery-limit"
                  label="每个目标市场最多处理数量"
                  min={1}
                  max={500}
                  value={limit}
                  onChange={(_event, stateValue) => setLimit(Number(stateValue.value) || 1)}
                />

                <Button
                  size="lg"
                  renderIcon={Play}
                  onClick={() => void start()}
                  disabled={starting || running || !country || !query.trim() || providers.length === 0 || (providers.includes("openstreetmap") && !osmTags.some((tag) => /^[a-z0-9_:-]{1,64}$/i.test(tag.key) && /^[a-z0-9_:-]{1,100}$/i.test(tag.value)))}
                >
                  {starting ? "正在创建任务…" : running ? "任务执行中" : "开始发现潜在客户"}
                </Button>
              </Stack>
            </Tile>
          </Stack>
        </Column>

        <Column sm={4} md={8} lg={8} xlg={8} max={8}>
          <Stack gap={7}>
            <Grid narrow>
              <Column sm={4} md={4} lg={8}>
                <Tile>
                  <Stack gap={3}>
                    <UserMultiple size={20} aria-hidden="true" />
                    <Heading className="cds--type-productive-heading-05">{run?.discoveredCount ?? "—"}</Heading>
                    <p className="cds--type-helper-text-01">发现候选</p>
                  </Stack>
                </Tile>
              </Column>
              <Column sm={4} md={4} lg={8}>
                <Tile>
                  <Stack gap={3}>
                    <Building size={20} aria-hidden="true" />
                    <Heading className="cds--type-productive-heading-05">{run?.createdLeadCount ?? "—"}</Heading>
                    <p className="cds--type-helper-text-01">发现记录</p>
                  </Stack>
                </Tile>
              </Column>
            </Grid>
            <MapLocalTaskExecutionPanel
              run={run}
              logs={logs}
              query={run?.query ?? query}
              providers={(run?.providers ?? providers).join(" + ")}
              running={running}
              progress={run?.progress ?? 0}
              onOpenResults={() => run && window.location.assign("/lead-discovery/results?runId=" + encodeURIComponent(run.id))}
              onOpenTasks={() => window.location.assign("/lead-discovery/tasks")}
            />
          </Stack>
        </Column>
      </Grid>
    </>
  );
}
