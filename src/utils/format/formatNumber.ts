export function formatNumber(value:number|null|undefined,locale="en-US"):string {
 if(value===null||value===undefined||!Number.isFinite(value))return "—";
 return new Intl.NumberFormat(locale,{maximumFractionDigits:20}).format(value);
}