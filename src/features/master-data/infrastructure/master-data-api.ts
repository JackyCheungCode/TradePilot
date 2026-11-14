import {getSupabaseClient} from "@/shared/lib/supabase";
export type MasterRecord=Record<string,unknown>&{id:string;created_at?:string;updated_at?:string};
async function request<T>(path:string,init?:RequestInit):Promise<T>{const {data:{session}}=await getSupabaseClient().auth.getSession();if(!session?.access_token)throw new Error("请先登录 TradePilot。");const response=await fetch(path,{...init,signal:init?.signal??AbortSignal.timeout(20000),headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token,...init?.headers}});const raw=await response.text();let body:{data?:T;error?:{message?:string}};try{body=JSON.parse(raw) as typeof body;}catch{throw new Error("主数据 API 返回无效响应（HTTP "+response.status+"）。");}if(!response.ok||body.data===undefined)throw new Error(body.error?.message??"主数据 API 请求失败（HTTP "+response.status+"）。");return body.data;}
const base="/api/v1/master-data/";
export const masterDataApi={
 list:(resource:string,query?:Record<string,string>)=>request<MasterRecord[]>(base+resource+(query?"?"+new URLSearchParams(query).toString():"")),
 create:(resource:string,input:Record<string,unknown>)=>request<MasterRecord>(base+resource,{method:"POST",body:JSON.stringify(input)}),
 update:(resource:string,id:string,input:Record<string,unknown>)=>request<MasterRecord>(base+resource+"/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify(input)}),
 remove:(resource:string,id:string)=>request<{deleted:boolean;archived?:boolean;id:string}>(base+resource+"/"+encodeURIComponent(id),{method:"DELETE"})
};
