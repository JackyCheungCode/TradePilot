export function formatDate(value:string|Date|null|undefined):string {
 if(value===null||value===undefined||value==="")return "—";
 if(typeof value==="string"){
  const parts=value.split("-");
  if(parts.length===3&&parts[0].length===4&&parts[1].length===2&&parts[2].length===2){
   const year=Number(parts[0]),month=Number(parts[1]),day=Number(parts[2]);
   const candidate=new Date(Date.UTC(year,month-1,day));
   if(candidate.getUTCFullYear()===year&&candidate.getUTCMonth()===month-1&&candidate.getUTCDate()===day)return value;
   return "—";
  }
 }
 const date=value instanceof Date?value:new Date(value);
 if(Number.isNaN(date.getTime()))return "—";
 const year=String(date.getFullYear()).padStart(4,"0");
 const month=String(date.getMonth()+1).padStart(2,"0");
 const day=String(date.getDate()).padStart(2,"0");
 return year+"-"+month+"-"+day;
}