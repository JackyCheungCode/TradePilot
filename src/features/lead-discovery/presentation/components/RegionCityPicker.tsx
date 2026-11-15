import { useEffect, useState } from "react";
import { ComboBox, InlineNotification, Grid, Column, Stack } from "@carbon/react";
import isoCountries from "i18n-iso-countries";

interface GeoResponse<T> { error?: boolean; msg?: string; data?: T; }
interface StateRecord { name: string; state_code?: string; }
interface CountryRecord { name: string; Iso2?: string; iso2?: string; }
type Option = { id: string; text: string };
const API = "https://countriesnow.space/api/v0.1";

function SearchablePicker({ id, label, value, options, placeholder, disabled, loading, onChange }: {
  id: string;
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (value: string) => void;
}) {
  const items: Option[] = options.map((option) => ({ id: option, text: option }));
  const selected = items.find((item) => item.id === value) ?? null;
  return (
    <ComboBox
      id={id}
      titleText={label}
      items={items}
      selectedItem={selected}
      itemToString={(item) => item?.text ?? ""}
      onChange={({ selectedItem }) => onChange(selectedItem?.id ?? "")}
      placeholder={loading ? "正在加载…" : placeholder}
      disabled={disabled || loading}
    />
  );
}

export function RegionCityPicker({ countryCode, state, city, onStateChange, onCityChange }: {
  countryCode: string;
  state: string;
  city: string;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
}) {
  const [countryNames, setCountryNames] = useState<Record<string, string>>({});
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [statesLoaded, setStatesLoaded] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState("");
  const countryName = countryCode ? countryNames[countryCode] ?? isoCountries.getName(countryCode, "en") ?? countryCode : undefined;

  useEffect(() => {
    const controller = new AbortController();
    fetch(API + "/countries/iso", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("国家名称数据请求失败（HTTP " + response.status + "）");
        const payload = await response.json() as GeoResponse<CountryRecord[]>;
        if (payload.error || !Array.isArray(payload.data)) throw new Error(payload.msg || "国家名称数据格式无效");
        const next: Record<string, string> = {};
        for (const item of payload.data) {
          const code = (item.Iso2 ?? item.iso2 ?? "").toUpperCase();
          if (code && item.name) next[code] = item.name;
        }
        setCountryNames(next);
      })
      .catch(() => {
        // Fall back to the ISO code if the public country list is unavailable.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!countryName) {
      setStates([]);
      setCities([]);
      setStatesLoaded(true);
      setLoadingStates(false);
      return;
    }
    const controller = new AbortController();
    setLoadingStates(true);
    setStatesLoaded(false);
    setError("");
    setStates([]);
    setCities([]);
    fetch(API + "/countries/states/q?country=" + encodeURIComponent(countryName), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("行政区划数据请求失败（HTTP " + response.status + "）");
        const payload = await response.json() as GeoResponse<{ states?: StateRecord[] }>;
        if (payload.error || !Array.isArray(payload.data?.states)) throw new Error(payload.msg || "暂时无法读取省州列表");
        setStates(payload.data.states.map((item) => item.name).filter(Boolean).sort((a, b) => a.localeCompare(b)));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "省州数据加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingStates(false);
          setStatesLoaded(true);
        }
      });
    return () => controller.abort();
  }, [countryName]);

  useEffect(() => {
    if (!countryName) {
      setCities([]);
      setLoadingCities(false);
      return;
    }
    if (!state && (!statesLoaded || states.length > 0)) {
      setCities([]);
      setLoadingCities(false);
      return;
    }
    const controller = new AbortController();
    setLoadingCities(true);
    setError("");
    setCities([]);
    const endpoint = state ? "/countries/state/cities" : "/countries/cities";
    const body = state ? { country: countryName, state } : { country: countryName };
    fetch(API + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("城市数据请求失败（HTTP " + response.status + "）");
        const payload = await response.json() as GeoResponse<string[]>;
        if (payload.error || !Array.isArray(payload.data)) throw new Error(payload.msg || "暂时无法读取城市列表");
        setCities(payload.data.filter(Boolean).sort((a, b) => a.localeCompare(b)));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "城市数据加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCities(false);
      });
    return () => controller.abort();
  }, [countryName, state, statesLoaded, states.length]);

  const cityAvailable = !!countryName && (!!state || (statesLoaded && states.length === 0));

  return (
    <Stack gap={4}>
      <Grid narrow>
        <Column sm={4} md={4} lg={4}>
          <SearchablePicker
            id="map-region-select"
            label="省 / 州"
            value={state}
            options={states}
            placeholder={countryCode ? (statesLoaded && !states.length ? "该国家暂无省州数据" : "全部省州（可选）") : "请先选择国家"}
            disabled={!countryCode || !states.length}
            loading={loadingStates}
            onChange={(next) => {
              onStateChange(next);
              onCityChange("");
            }}
          />
        </Column>
        <Column sm={4} md={4} lg={4}>
          <SearchablePicker
            id="map-city-select"
            label="城市"
            value={city}
            options={cities}
            placeholder={state ? "全部城市（可选）" : cityAvailable ? "选择城市（可选）" : "请先选择省州"}
            disabled={!cityAvailable || !cities.length}
            loading={loadingCities}
            onChange={onCityChange}
          />
        </Column>
      </Grid>
      {error ? <InlineNotification kind="warning" title="行政区划数据暂不可用" subtitle={error} hideCloseButton /> : null}
      <p className="cds--type-helper-text-01">
        省州与城市由 CountriesNow 开放数据自动加载；无省州层级的国家会直接提供城市列表，覆盖范围因国家而异。
      </p>
    </Stack>
  );
}
