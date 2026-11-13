import { getSupabaseClient } from "@/shared/lib/supabase";
export interface SearchExclusionCategory { key:string; label:string; domains:string[]; enabled:boolean; }
async function request<T>(init?:RequestInit):Promise<T>{
 const {data:{session}}=await getSupabaseClient().auth.getSession();if(!session?.access_token)throw new Error("请先登录后管理搜索排除规则。");
 const response=await fetch("/api/v1/settings/search-exclusions",{...init,headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token,...init?.headers}});
 const body=await response.json() as {data?:T;error?:{message?:string}};if(!response.ok)throw new Error(body.error?.message??"搜索排除规则请求失败。");return body.data as T;
}
export const searchExclusionsApi={get:()=>request<SearchExclusionCategory[]>(),save:(categories:SearchExclusionCategory[])=>request<{saved:boolean}>({method:"PUT",body:JSON.stringify({categories})})};
