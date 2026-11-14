import { getSupabaseClient } from "@/shared/lib/supabase";
export interface TradeParty {id:string;party_type:string;legal_name:string;display_name?:string|null;country_code?:string|null;email?:string|null;phone?:string|null;website?:string|null;address?:Record<string,unknown>;is_active:boolean;created_at:string;updated_at:string;}
export interface TradeProduct {id:string;sku?:string|null;name:string;description?:string|null;hs_code?:string|null;unit:string;default_currency?:string|null;default_unit_price?:number|null;is_active:boolean;}
export interface TradeOrderItem {id:string;product_id?:string|null;product_name:string;sku?:string|null;quantity:number;unit:string;unit_price:number;discount_amount:number;tax_rate:number;amount:number;line_number:number;}
export interface TradeOrder {id:string;order_number:string;order_type:"sales"|"purchase";title:string;status:string;currency_code:string;created_at:string;updated_at:string;trade_order_items?:TradeOrderItem[];}
export interface TradeDocument {id:string;document_number:string;document_type:string;title:string;status:string;locale:string;currency_code:string;order_id:string;current_version:number;created_at:string;content?:Record<string,unknown>;totals?:Record<string,unknown>;}
export interface TradeDocumentDetail extends TradeDocument {trade_document_versions?:Array<{version_number:number;content_snapshot:Record<string,unknown>;totals_snapshot:Record<string,unknown>;created_at:string}>;}
export interface TradeDocumentTemplate {id:string;name:string;document_type:string;locale:string;description:string;is_default:boolean;is_active:boolean;template_config:Record<string,unknown>;created_at:string;updated_at:string;}
async function request<T>(path:string,init?:RequestInit):Promise<T>{
 const {data:{session}}=await getSupabaseClient().auth.getSession();if(!session?.access_token)throw new Error("请先登录 TradePilot。");
 const response=await fetch(path,{...init,signal:init?.signal??AbortSignal.timeout(20000),headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token,...init?.headers}});
 const raw=await response.text();let body:{data?:T;error?:{message?:string}};try{body=JSON.parse(raw) as typeof body;}catch{throw new Error("单据 API 返回无效响应（HTTP "+response.status+"）。");}
 if(!response.ok||body.data===undefined)throw new Error(body.error?.message??"单据 API 请求失败（HTTP "+response.status+"）。");return body.data;
}
export const tradeApi={
 listParties:()=>request<TradeParty[]>("/api/v1/trade/parties"),
 createParty:(input:Partial<TradeParty>&{legal_name:string;party_type:string})=>request<TradeParty>("/api/v1/trade/parties",{method:"POST",body:JSON.stringify(input)}),
 listProducts:()=>request<TradeProduct[]>("/api/v1/trade/products"),
 createProduct:(input:Partial<TradeProduct>&{name:string})=>request<TradeProduct>("/api/v1/trade/products",{method:"POST",body:JSON.stringify(input)}),
 listOrders:()=>request<TradeOrder[]>("/api/v1/trade/orders"),
 createOrder:(input:{title:string;order_type:"sales"|"purchase";currency_code?:string})=>request<TradeOrder>("/api/v1/trade/orders",{method:"POST",body:JSON.stringify(input)}),
 listOrderItems:(orderId:string)=>request<TradeOrderItem[]>("/api/v1/trade/orders/"+encodeURIComponent(orderId)+"/items"),
 createOrderItem:(orderId:string,input:{product_id?:string|null;product_name:string;sku?:string|null;quantity:string;unit:string;unit_price:string;discount_amount?:string;tax_rate?:string;hs_code?:string|null})=>request<TradeOrderItem>("/api/v1/trade/orders/"+encodeURIComponent(orderId)+"/items",{method:"POST",body:JSON.stringify(input)}),
 updateOrderItem:(orderId:string,id:string,input:{product_name?:string;sku?:string|null;quantity?:string;unit?:string;unit_price?:string;discount_amount?:string;tax_rate?:string})=>request<TradeOrderItem>("/api/v1/trade/orders/"+encodeURIComponent(orderId)+"/items",{method:"PATCH",body:JSON.stringify({id,...input})}),
 deleteOrderItem:(orderId:string,id:string)=>request<{deleted:boolean;id:string}>("/api/v1/trade/orders/"+encodeURIComponent(orderId)+"/items?id="+encodeURIComponent(id),{method:"DELETE"}),
 listDocuments:()=>request<TradeDocument[]>("/api/v1/trade/documents"),
 getDocument:(id:string)=>request<TradeDocumentDetail>("/api/v1/trade/documents/"+encodeURIComponent(id)),
 updateDocument:(id:string,input:{content:Record<string,unknown>;totals:Record<string,unknown>;locale:string;currency_code:string;current_version:number})=>request<TradeDocument>("/api/v1/trade/documents/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify(input)}),
 createDocument:(input:{order_id:string;document_type:string;title?:string;locale?:string;currency_code?:string;source_document_id?:string;template_id?:string;content?:Record<string,unknown>;totals?:Record<string,unknown>})=>request<TradeDocument>("/api/v1/trade/documents",{method:"POST",body:JSON.stringify(input)}),
 listTemplates:()=>request<TradeDocumentTemplate[]>("/api/v1/trade/templates"),
 createTemplate:(input:{name:string;document_type:string;locale?:string;description?:string;is_default?:boolean;template_config?:Record<string,unknown>})=>request<TradeDocumentTemplate>("/api/v1/trade/templates",{method:"POST",body:JSON.stringify(input)}),
 updateTemplate:(id:string,input:Partial<TradeDocumentTemplate>)=>request<TradeDocumentTemplate>("/api/v1/trade/templates/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify(input)}),
 deleteTemplate:(id:string)=>request<{deleted:boolean;id:string}>("/api/v1/trade/templates/"+encodeURIComponent(id),{method:"DELETE"}),
};
