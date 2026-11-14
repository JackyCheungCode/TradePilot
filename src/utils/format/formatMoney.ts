export function formatMoney(value:number|null|undefined,currency:string,fractionDigits=2,locale="en-US"):string {
 if(value===null||value===undefined||!Number.isFinite(value))return "—";
 if(!Number.isInteger(fractionDigits)||fractionDigits<0||fractionDigits>20)throw new RangeError("fractionDigits must be an integer between 0 and 20");
 return new Intl.NumberFormat(locale,{style:"currency",currency,minimumFractionDigits:fractionDigits,maximumFractionDigits:fractionDigits}).format(value);
}