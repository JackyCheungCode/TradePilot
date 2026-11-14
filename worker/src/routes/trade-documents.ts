import { errorResponse, successResponse } from "../lib/http";

interface Env { SUPABASE_URL:string; SUPABASE_ANON_KEY:string; SUPABASE_SERVICE_ROLE_KEY:string; }
type Json=Record<string,unknown>;
async function ownerFromRequest(request:Request,env:Env):Promise<string|null>{
 const token=request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];if(!token)return null;
 const response=await fetch(env.SUPABASE_URL+"/auth/v1/user",{headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:"Bearer "+token},signal:AbortSignal.timeout(10000)});
 if(!response.ok)return null;const user=await response.json() as {id?:string};return user.id??null;
}
async function db<T>(env:Env,path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(env.SUPABASE_URL+"/rest/v1/"+path,{...init,signal:init.signal??AbortSignal.timeout(12000),headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json",...init.headers}});
 const raw=await response.text();if(!response.ok)throw new Error("DATABASE_"+response.status+": "+raw.slice(0,300));return raw?JSON.parse(raw) as T:undefined as T;
}
function obj(value:unknown):Json{return value&&typeof value==="object"&&!Array.isArray(value)?value as Json:{};}
function str(value:unknown,max=240):string{return typeof value==="string"?value.trim().slice(0,max):"";}
function jsonBody(value:unknown):Json{return obj(value);}
function query(url:URL,key:string):string{return encodeURIComponent(url.searchParams.get(key)??"");}
async function createNumber(env:Env,ownerId:string,key:string):Promise<string>{
 const year=new Date().getUTCFullYear();
 const rows=await db<number>(env,"rpc/next_trade_document_number",{method:"POST",body:JSON.stringify({p_owner_id:ownerId,p_sequence_key:key,p_sequence_year:year})});
 return String(rows).padStart(5,"0");
}
async function list(env:Env,table:string,ownerId:string,url:URL,select:string,order="updated_at.desc"):Promise<unknown>{
 const params=new URLSearchParams({select,owner_id:"eq."+ownerId,order,limit:"100"});
 const search=url.searchParams.get("search");if(search){params.set("or","(legal_name.ilike.*"+search.replace(/[(),]/g,"")+"*,name.ilike.*"+search.replace(/[(),]/g,"")+"*,title.ilike.*"+search.replace(/[(),]/g,"")+"*)");}
 return db(env,table+"?"+params.toString());
}
export async function handleTradeDocuments(request:Request,env:Env):Promise<Response>{
 const ownerId=await ownerFromRequest(request,env);if(!ownerId)return errorResponse(request,"UNAUTHORIZED","请先登录 TradePilot。",401);
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/v1\/trade\/?/,"").split("/").filter(Boolean),method=request.method;
 try{
  if(path.length===1&&path[0]==="parties"){
   if(method==="GET")return successResponse(request,await list(env,"trade_parties",ownerId,url,"id,party_type,legal_name,display_name,country_code,registration_number,tax_number,email,phone,website,address,contact_person,notes,is_active,created_at,updated_at"));
   if(method==="POST"){const b=jsonBody(await request.json());const legal_name=str(b.legal_name);if(!legal_name)return errorResponse(request,"VALIDATION_ERROR","请填写主体法定名称。",400);
    const rows=await db<Json[]>(env,"trade_parties",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,party_type:["company","customer","supplier","carrier","bank","other"].includes(str(b.party_type))?b.party_type:"customer",legal_name,display_name:str(b.display_name),country_code:str(b.country_code,2).toUpperCase(),registration_number:str(b.registration_number),tax_number:str(b.tax_number),email:str(b.email,320),phone:str(b.phone,80),website:str(b.website,1000),address:obj(b.address),contact_person:obj(b.contact_person),notes:str(b.notes,5000)})});return successResponse(request,rows[0],201);}
  }
  if(path.length===1&&path[0]==="products"){
   if(method==="GET")return successResponse(request,await list(env,"trade_products",ownerId,url,"id,sku,name,description,specifications,hs_code,origin_country_code,unit,default_currency,default_unit_price,net_weight,gross_weight,weight_unit,is_active,created_at,updated_at"));
   if(method==="POST"){const b=jsonBody(await request.json());const name=str(b.name);if(!name)return errorResponse(request,"VALIDATION_ERROR","请填写产品名称。",400);
    const rows=await db<Json[]>(env,"trade_products",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,sku:str(b.sku,100)||null,name,description:str(b.description,5000),specifications:obj(b.specifications),hs_code:str(b.hs_code,32),origin_country_code:str(b.origin_country_code,2).toUpperCase(),unit:str(b.unit,32)||"pcs",default_currency:str(b.default_currency,3).toUpperCase()||null,default_unit_price:b.default_unit_price??null,net_weight:b.net_weight??null,gross_weight:b.gross_weight??null,weight_unit:str(b.weight_unit,20)||null})});return successResponse(request,rows[0],201);}
  }
  if(path.length===1&&path[0]==="orders"){
   if(method==="GET"){const params=new URLSearchParams({select:"*,trade_order_items(*)",owner_id:"eq."+ownerId,order:"updated_at.desc",limit:"100"});if(url.searchParams.has("order_type"))params.set("order_type","eq."+url.searchParams.get("order_type"));return successResponse(request,await db(env,"trade_orders?"+params.toString()));}
   if(method==="POST"){const b=jsonBody(await request.json());const title=str(b.title);const type=str(b.order_type);if(!title||!["sales","purchase"].includes(type))return errorResponse(request,"VALIDATION_ERROR","业务名称和业务类型为必填项。",400);
    const year=new Date().getUTCFullYear(),seq=await createNumber(env,ownerId,"ORDER");
    const rows=await db<Json[]>(env,"trade_orders",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,order_number:"TP-"+year+"-"+seq,order_type:type,title,status:"draft",seller_party_id:b.seller_party_id??null,buyer_party_id:b.buyer_party_id??null,supplier_party_id:b.supplier_party_id??null,currency_code:str(b.currency_code,3).toUpperCase()||"USD",payment_terms:str(b.payment_terms,2000),incoterms_code:str(b.incoterms_code,3).toUpperCase()||null,incoterms_version:str(b.incoterms_version,8)||"2020",named_place:str(b.named_place,240),trade_date:b.trade_date??null,delivery_date:b.delivery_date??null,origin_location:str(b.origin_location,240),destination_location:str(b.destination_location,240),shipping:obj(b.shipping),packaging:obj(b.packaging),notes:str(b.notes,5000)})});
    await db(env,"trade_document_events",{method:"POST",body:JSON.stringify({owner_id:ownerId,order_id:rows[0].id,event_type:"order.created",payload:{order_number:rows[0].order_number}})});return successResponse(request,rows[0],201);}
  }
  if(path.length===2&&path[0]==="orders"&&path[1]){
   const id=path[1];
   if(method==="GET"){const rows=await db<Json[]>(env,"trade_orders?select=*,trade_order_items(*)&id=eq."+encodeURIComponent(id)+"&owner_id=eq."+ownerId+"&limit=1");if(!rows.length)return errorResponse(request,"NOT_FOUND","业务档案不存在。",404);return successResponse(request,rows[0]);}
   if(method==="PATCH"){const b=jsonBody(await request.json());const allowed=["title","status","seller_party_id","buyer_party_id","supplier_party_id","currency_code","payment_terms","incoterms_code","incoterms_version","named_place","trade_date","delivery_date","origin_location","destination_location","shipping","packaging","notes","metadata"];const patch:Json={updated_at:new Date().toISOString()};for(const k of allowed)if(k in b)patch[k]=b[k];const rows=await db<Json[]>(env,"trade_orders?id=eq."+encodeURIComponent(id)+"&owner_id=eq."+ownerId,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)});if(!rows.length)return errorResponse(request,"NOT_FOUND","业务档案不存在。",404);return successResponse(request,rows[0]);}
  }
  if(path.length===3&&path[0]==="orders"&&path[2]==="items"){
   const orderId=path[1];
   if(method==="GET")return successResponse(request,await db(env,"trade_order_items?select=*&order_id=eq."+encodeURIComponent(orderId)+"&owner_id=eq."+ownerId+"&order=line_number.asc"));
   if(method==="POST"){const b=jsonBody(await request.json());const productName=str(b.product_name);const quantity=Number(b.quantity);const price=Number(b.unit_price??0);if(!productName||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(price)||price<0)return errorResponse(request,"VALIDATION_ERROR","产品名称、正数数量和有效单价为必填项。",400);
    const existing=await db<Array<{line_number:number}>>(env,"trade_order_items?select=line_number&order_id=eq."+encodeURIComponent(orderId)+"&owner_id=eq."+ownerId+"&order=line_number.desc&limit=1");
    const rows=await db<Json[]>(env,"trade_order_items",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,order_id:orderId,product_id:b.product_id??null,line_number:(existing[0]?.line_number??0)+1,sku:str(b.sku,100),product_name:productName,description:str(b.description,3000),hs_code:str(b.hs_code,32),origin_country_code:str(b.origin_country_code,2).toUpperCase(),quantity,unit:str(b.unit,32)||"pcs",unit_price:price,discount_amount:Number(b.discount_amount??0),tax_rate:Number(b.tax_rate??0),net_weight:b.net_weight??null,gross_weight:b.gross_weight??null,weight_unit:str(b.weight_unit,20)})});return successResponse(request,rows[0],201);}
  }
  if(path.length===1&&path[0]==="documents"){
   if(method==="GET"){const params=new URLSearchParams({select:"*,trade_orders(order_number,title)",owner_id:"eq."+ownerId,order:"created_at.desc",limit:"100"});if(url.searchParams.has("order_id"))params.set("order_id","eq."+url.searchParams.get("order_id"));return successResponse(request,await db(env,"trade_documents?"+params.toString()));}
   if(method==="POST"){const b=jsonBody(await request.json());const orderId=str(b.order_id,64),type=str(b.document_type);if(!orderId||!type)return errorResponse(request,"VALIDATION_ERROR","请选择业务档案和单据类型。",400);
    const title=str(b.title,240)||type;const year=new Date().getUTCFullYear(),seq=await createNumber(env,ownerId,type.toUpperCase());const number="TP-"+type.toUpperCase().slice(0,5)+"-"+year+"-"+seq;
    const content=obj(b.content),totals=obj(b.totals),locale=str(b.locale,20)||"en";
    const rows=await db<Json[]>(env,"trade_documents",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_id:ownerId,order_id:orderId,document_type:type,document_number:number,title,status:"draft",locale,currency_code:str(b.currency_code,3).toUpperCase()||"USD",source_document_id:b.source_document_id??null,current_version:1,content,totals})});
    const doc=rows[0];await db(env,"trade_document_versions",{method:"POST",body:JSON.stringify({owner_id:ownerId,document_id:doc.id,version_number:1,content_snapshot:content,totals_snapshot:totals,locale,created_by:ownerId})});
    await db(env,"trade_document_events",{method:"POST",body:JSON.stringify({owner_id:ownerId,document_id:doc.id,order_id:orderId,event_type:"document.created",payload:{document_number:number,document_type:type}})});return successResponse(request,doc,201);}
  }
  if(path.length===2&&path[0]==="documents"){
   const id=path[1];
   if(method==="GET"){const rows=await db<Json[]>(env,"trade_documents?select=*,trade_document_versions(*)&id=eq."+encodeURIComponent(id)+"&owner_id=eq."+ownerId+"&limit=1");if(!rows.length)return errorResponse(request,"NOT_FOUND","单据不存在。",404);return successResponse(request,rows[0]);}
   if(method==="PATCH"){const b=jsonBody(await request.json());const rows=await db<Json[]>(env,"trade_documents?id=eq."+encodeURIComponent(id)+"&owner_id=eq."+ownerId+"&status=eq.draft",{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({content:obj(b.content),totals:obj(b.totals),locale:str(b.locale,20)||"en",currency_code:str(b.currency_code,3).toUpperCase()||"USD",current_version:Number(b.current_version??1)+1,updated_at:new Date().toISOString()})});if(!rows.length)return errorResponse(request,"CONFLICT","仅草稿单据可编辑，或单据不存在。",409);
    const doc=rows[0];await db(env,"trade_document_versions",{method:"POST",body:JSON.stringify({owner_id:ownerId,document_id:id,version_number:doc.current_version,content_snapshot:doc.content,totals_snapshot:doc.totals,locale:doc.locale,created_by:ownerId})});await db(env,"trade_document_events",{method:"POST",body:JSON.stringify({owner_id:ownerId,document_id:id,order_id:doc.order_id,event_type:"document.updated",payload:{version:doc.current_version}})});return successResponse(request,doc);}
  }
  return errorResponse(request,"NOT_FOUND","Trade API endpoint not found.",404);
 }catch(error){console.error("TRADE_DOCUMENT_API_ERROR",{path:url.pathname,error:String(error).slice(0,400)});return errorResponse(request,"TRADE_DOCUMENT_ERROR",String(error).startsWith("DATABASE_")?"单据数据保存失败，请检查资料和关联关系。":"单据服务暂时不可用，请稍后重试。",500);}
}
