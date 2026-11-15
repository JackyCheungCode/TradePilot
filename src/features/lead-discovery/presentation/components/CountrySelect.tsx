import isoCountries from "i18n-iso-countries";
import zhLocale from "i18n-iso-countries/langs/zh.json";
import { ComboBox } from "@carbon/react";

isoCountries.registerLocale(zhLocale);

type CountryOption = { id: string; text: string };
const specialNames: Record<string, string> = { HK: "中国香港", MO: "中国澳门", TW: "中国台湾" };
const countries: CountryOption[] = Object.keys(isoCountries.getAlpha2Codes())
  .map((code) => ({
    id: code,
    text: (specialNames[code] ?? isoCountries.getName(code, "zh") ?? code) + " · " + code,
  }))
  .sort((a, b) => a.text.localeCompare(b.text, "zh"));

export function CountrySelect({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = countries.find((country) => country.id === value) ?? null;
  return (
    <ComboBox
      id="map-country-select"
      titleText="国家 / 地区"
      items={countries}
      selectedItem={selected}
      itemToString={(item) => item?.text ?? ""}
      onChange={({ selectedItem }) => onChange(selectedItem?.id ?? value)}
      placeholder="搜索并选择国家或地区"
    />
  );
}
