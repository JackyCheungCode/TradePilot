import {describe,expect,it} from "vitest";
import {formatDate} from "./formatDate";
import {formatMoney} from "./formatMoney";
import {formatNumber} from "./formatNumber";
import {formatValue} from "./formatValue";
describe("format utilities",()=>{
 it("keeps date-only strings timezone safe",()=>{expect(formatDate("2026-11-15")).toBe("2026-11-15");expect(formatDate("2026-02-30")).toBe("—");});
 it("formats Date values and rejects invalid dates",()=>{expect(formatDate(new Date(2026,10,15))).toBe("2026-11-15");expect(formatDate("not-a-date")).toBe("—");});
 it("formats grouped numbers and preserves zero",()=>{expect(formatNumber(1234567)).toBe("1,234,567");expect(formatNumber(0)).toBe("0");expect(formatNumber(null)).toBe("—");});
 it("formats currency with fixed decimals",()=>{expect(formatMoney(1234.5,"USD",2)).toBe("$1,234.50");expect(formatMoney(1234,"USD",0)).toBe("$1,234");expect(formatMoney(null,"USD")).toBe("—");});
 it("uses an em dash for empty values only",()=>{expect(formatValue(null)).toBe("—");expect(formatValue(undefined)).toBe("—");expect(formatValue("")).toBe("—");expect(formatValue(0)).toBe(0);});
});