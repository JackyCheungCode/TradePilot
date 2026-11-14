export function formatValue<T>(value:T|null|undefined|""):T|"—" {
 if(value===null||value===undefined||value==="")return "—";
 if(typeof value==="number"&&!Number.isFinite(value))return "—";
 return value;
}