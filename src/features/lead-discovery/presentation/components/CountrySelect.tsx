import isoCountries from "i18n-iso-countries";
import zhLocale from "i18n-iso-countries/langs/zh.json";
import { Combobox } from "@/shared/ui/primitives";

isoCountries.registerLocale(zhLocale);

const flag = (code: string) =>
  String.fromCodePoint(...code.toUpperCase().split("").map((character) => 127397 + character.charCodeAt(0)));
const specialNames: Record<string, string> = { HK: "中国香港", MO: "中国澳门", TW: "中国台湾" };
const countries = Object.keys(isoCountries.getAlpha2Codes())
  .map((code) => ({
    code,
    name: specialNames[code] ?? isoCountries.getName(code, "zh") ?? code,
    flag: flag(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function CountrySelect({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">国家 / 地区</label>
      <Combobox
        value={value}
        onValueChange={onChange}
        placeholder="选择国家或地区"
        searchPlaceholder="搜索国家 / 地区"
        options={countries.map((country) => ({
          value: country.code,
          label: country.flag + " " + country.name,
          description: country.code,
        }))}
      />
    </div>
  );
}
