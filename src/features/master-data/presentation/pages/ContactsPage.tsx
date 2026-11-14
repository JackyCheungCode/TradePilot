import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AtSign, Facebook, Globe, Instagram, Linkedin, Mail, MessageCircle, MessageSquare,
  Music2, Phone, Plus, RefreshCw, Search, Send, Smartphone, Trash2, UserRound,
  Video, Youtube, X, Pencil, Star, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Combobox, Input, Textarea } from "@/shared/ui/primitives";
import { PageControlPanel } from "@/shared/ui/page-layout";
import { FormField } from "@/shared/ui/data-views";
import { masterDataApi, type MasterRecord } from "@/features/master-data/infrastructure/master-data-api";

type MethodType = "email" | "phone" | "mobile" | "messaging" | "social" | "website" | "other";
type ContactMethod = {
  id?: string;
  draftId: string;
  method_type: MethodType;
  platform: string;
  value: string;
  label: string;
  is_primary: boolean;
  is_verified: boolean;
};
type ContactDraft = {
  account_id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  department: string;
  notes: string;
};
const typeOptions = [
  { value: "email", label: "邮箱" }, { value: "phone", label: "电话" },
  { value: "mobile", label: "手机" }, { value: "messaging", label: "即时通讯" },
  { value: "social", label: "社交媒体" }, { value: "website", label: "网站 / 主页" },
  { value: "other", label: "其他" },
];
const platformOptions: Record<MethodType, Array<{value:string;label:string}>> = {
  email: [{value:"email",label:"电子邮件"},{value:"work_email",label:"工作邮箱"},{value:"personal_email",label:"个人邮箱"}],
  phone: [{value:"phone",label:"办公电话"},{value:"landline",label:"座机"},{value:"fax",label:"传真"}],
  mobile: [{value:"mobile",label:"手机"}],
  messaging: [{value:"whatsapp",label:"WhatsApp"},{value:"wechat",label:"微信"},{value:"telegram",label:"Telegram"},{value:"line",label:"LINE"},{value:"skype",label:"Skype"},{value:"messenger",label:"Messenger"}],
  social: [{value:"linkedin",label:"LinkedIn"},{value:"facebook",label:"Facebook"},{value:"instagram",label:"Instagram"},{value:"x",label:"X"},{value:"tiktok",label:"TikTok"},{value:"youtube",label:"YouTube"},{value:"pinterest",label:"Pinterest"},{value:"threads",label:"Threads"}],
  website: [{value:"website",label:"网站"},{value:"portfolio",label:"个人主页"}],
  other: [{value:"other",label:"其他平台"}],
};
const iconFor = (platform: string, size = "h-4 w-4") => {
  const props = { className: size };
  switch (platform.toLowerCase()) {
    case "email": case "work_email": case "personal_email": return <Mail {...props}/>;
    case "phone": case "landline": case "fax": return <Phone {...props}/>;
    case "mobile": return <Smartphone {...props}/>;
    case "whatsapp": return <MessageCircle {...props}/>;
    case "wechat": case "messenger": return <MessageSquare {...props}/>;
    case "telegram": return <Send {...props}/>;
    case "line": return <MessageCircle {...props}/>;
    case "linkedin": return <Linkedin {...props}/>;
    case "facebook": return <Facebook {...props}/>;
    case "instagram": return <Instagram {...props}/>;
    case "youtube": return <Youtube {...props}/>;
    case "tiktok": return <Music2 {...props}/>;
    case "x": case "threads": return <AtSign {...props}/>;
    case "website": case "portfolio": return <Globe {...props}/>;
    default: return <MessageCircle {...props}/>;
  }
};
const methodName = (method: ContactMethod) =>
  platformOptions[method.method_type]?.find(item => item.value === method.platform)?.label ??
  (method.platform === "other" ? "其他平台" : method.platform || "其他联系方式");
const blankContact = (): ContactDraft => ({ account_id: "", first_name: "", last_name: "", job_title: "", department: "", notes: "" });
const newMethod = (): ContactMethod => ({ draftId: crypto.randomUUID(), method_type: "email", platform: "email", value: "", label: "", is_primary: false, is_verified: false });

export function ContactsPage() {
  const [contacts, setContacts] = useState<MasterRecord[]>([]);
  const [accounts, setAccounts] = useState<MasterRecord[]>([]);
  const [methods, setMethods] = useState<ContactMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [contact, setContact] = useState<ContactDraft>(blankContact());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contactRows, accountRows, methodRows] = await Promise.all([
        masterDataApi.list("crm/contacts"),
        masterDataApi.list("crm/accounts"),
        masterDataApi.list("crm/contact-methods"),
      ]);
      setContacts(contactRows.filter(row => row.is_archived !== true));
      setAccounts(accountRows.filter(row => row.is_archived !== true));
      setMethods(methodRows.map(row => ({
        id: row.id, draftId: row.id, method_type: String(row.method_type) as MethodType,
        platform: String(row.platform ?? ""), value: String(row.value ?? ""),
        label: String(row.label ?? ""), is_primary: row.is_primary === true, is_verified: row.is_verified === true,
      })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取联系人失败");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const accountName = useCallback((id: string) => {
    const account = accounts.find(item => item.id === id);
    return String(account?.account_name ?? account?.legal_name ?? "未关联客户");
  }, [accounts]);
  const methodsFor = useCallback((id: string) => methods.filter(item => {
    const row = contacts.find(contactRow => contactRow.id === id);
    return item.id && row && String(row.id) === id && (item as ContactMethod & {contact_id?:string}).contact_id !== "__never__";
  }), [contacts, methods]);
  const visible = useMemo(() => contacts.filter(row => {
    if (accountFilter && row.account_id !== accountFilter) return false;
    const rowMethods = methods.filter(item => {
      const methodRow = item as ContactMethod & { contact_id?: string };
      return methodRow.contact_id === row.id;
    });
    const text = [row.first_name,row.last_name,row.full_name,row.job_title,row.department,accountName(String(row.account_id ?? "")),...rowMethods.map(item => item.value)].join(" ").toLowerCase();
    return text.includes(search.toLowerCase());
  }), [contacts, methods, search, accountFilter, accountName]);

  const startCreate = () => {
    setEditingId(""); setContact(blankContact()); setMethodsDraft([newMethod()]); setShowEditor(true);
  };
  const [methodsDraft, setMethodsDraft] = useState<ContactMethod[]>([]);
  const startEdit = async (row: MasterRecord) => {
    setEditingId(row.id);
    setContact({
      account_id: String(row.account_id ?? ""), first_name: String(row.first_name ?? ""),
      last_name: String(row.last_name ?? ""), job_title: String(row.job_title ?? ""),
      department: String(row.department ?? ""), notes: String(row.notes ?? ""),
    });
    const loaded = methods.filter(item => (item as ContactMethod & {contact_id?:string}).contact_id === row.id);
    const fallback: ContactMethod[] = [];
    for (const [type, platform, value, label] of [
      ["email","email",row.email,"工作邮箱"],["phone","phone",row.phone,"办公电话"],
      ["mobile","mobile",row.mobile,"手机"],["messaging","whatsapp",row.whatsapp,"WhatsApp"],
      ["social","linkedin",row.linkedin_url,"LinkedIn"],
    ] as Array<[MethodType,string,unknown,string]>) {
      if (value && !loaded.some(item => item.platform === platform && item.value === String(value))) fallback.push({...newMethod(),method_type:type,platform,value:String(value),label});
    }
    setMethodsDraft([...loaded, ...fallback].length ? [...loaded, ...fallback] : [newMethod()]);
    setShowEditor(true);
  };
  const updateMethod = (draftId: string, patch: Partial<ContactMethod>) => setMethodsDraft(current => current.map(item => item.draftId === draftId ? {...item,...patch} : item));
  const addMethod = () => setMethodsDraft(current => [...current,newMethod()]);
  const removeMethod = (draftId: string) => setMethodsDraft(current => current.filter(item => item.draftId !== draftId));

  const save = async () => {
    if (!contact.account_id || !contact.first_name.trim()) {
      toast.error("请选择所属客户并填写联系人名字。"); return;
    }
    const validMethods = methodsDraft.filter(item => item.value.trim());
    const duplicate = validMethods.find((item,index) => validMethods.findIndex(other => other.method_type === item.method_type && other.platform === item.platform && other.value.trim().toLowerCase() === item.value.trim().toLowerCase()) !== index);
    if (duplicate) { toast.error("联系方式中存在重复账号，请检查。"); return; }
    setSaving(true);
    try {
      const legacy: Record<string,string|null> = {email:null,phone:null,mobile:null,whatsapp:null,linkedin_url:null};
      for (const item of validMethods) {
        if (item.platform === "email" || item.platform === "work_email" || item.platform === "personal_email") legacy.email ??= item.value.trim();
        if (item.platform === "phone" || item.platform === "landline") legacy.phone ??= item.value.trim();
        if (item.platform === "mobile") legacy.mobile ??= item.value.trim();
        if (item.platform === "whatsapp") legacy.whatsapp ??= item.value.trim();
        if (item.platform === "linkedin") legacy.linkedin_url ??= item.value.trim();
      }
      const payload = {
        ...contact, full_name: [contact.first_name.trim(),contact.last_name.trim()].filter(Boolean).join(" "),
        email: legacy.email, phone: legacy.phone, mobile: legacy.mobile, whatsapp: legacy.whatsapp,
        linkedin_url: legacy.linkedin_url, is_active: true,
      };
      const saved = editingId
        ? await masterDataApi.update("crm/contacts", editingId, payload)
        : await masterDataApi.create("crm/contacts", payload);
      const currentMethods = editingId ? methods.filter(item => (item as ContactMethod & {contact_id?:string}).contact_id === editingId) : [];
      const nextIds = new Set(validMethods.map(item => item.id).filter(Boolean));
      for (const old of currentMethods) if (old.id && !nextIds.has(old.id)) await masterDataApi.remove("crm/contact-methods",old.id);
      for (const item of validMethods) {
        const methodPayload = {
          contact_id: saved.id, method_type: item.method_type, platform: item.platform,
          value: item.value.trim(), label: item.label.trim() || null,
          is_primary: item.is_primary, is_verified: item.is_verified,
        };
        if (item.is_primary) {
          const peers = currentMethods.filter(old => old.id !== item.id && old.method_type === item.method_type && old.platform === item.platform && old.is_primary);
          for (const peer of peers) await masterDataApi.update("crm/contact-methods",peer.id!,{is_primary:false});
        }
        if (item.id) await masterDataApi.update("crm/contact-methods",item.id,methodPayload);
        else await masterDataApi.create("crm/contact-methods",methodPayload);
      }
      toast.success(editingId ? "联系人已更新" : "联系人已创建");
      setShowEditor(false); await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存联系人失败");
    } finally { setSaving(false); }
  };

  const archive = async (row: MasterRecord) => {
    if (!window.confirm("确定归档该联系人？联系方式会保留在归档联系人记录中。")) return;
    try { await masterDataApi.remove("crm/contacts",row.id); toast.success("联系人已归档"); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "归档失败"); }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] min-w-0 space-y-5 p-3 sm:p-4 lg:p-6">
      <PageControlPanel eyebrow="客户关系管理" title="联系人" description="统一管理联系人及其邮箱、电话、即时通讯和社交媒体账号。" actions={<><Button onClick={startCreate}><Plus className="h-4 w-4"/>新建联系人</Button><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="h-4 w-4"/>刷新</Button></>}/>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索姓名、公司、职位、邮箱、电话或社交账号" className="pl-9"/></div>
        <Combobox value={accountFilter} onValueChange={setAccountFilter} placeholder="全部客户" className="w-full sm:w-[240px]" options={[{value:"",label:"全部客户"},...accounts.map(item=>({value:item.id,label:String(item.account_name ?? item.legal_name ?? "未命名客户")}))]}/>
      </div>
      {showEditor && <Card className="min-w-0"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{editingId ? "编辑联系人" : "新建联系人"}</CardTitle><CardDescription>为联系人添加任意数量的沟通渠道；同一平台可保存多个账号。</CardDescription></div><Button variant="ghost" size="icon" onClick={()=>setShowEditor(false)} aria-label="关闭"><X className="h-4 w-4"/></Button></div></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="所属客户" required><Combobox value={contact.account_id} onValueChange={value=>setContact(current=>({...current,account_id:value}))} placeholder="选择客户" options={accounts.map(item=>({value:item.id,label:String(item.account_name ?? item.legal_name ?? "未命名客户")}))}/></FormField>
            <FormField label="名字" required><Input value={contact.first_name} onChange={event=>setContact(current=>({...current,first_name:event.target.value}))} placeholder="名字"/></FormField>
            <FormField label="姓氏"><Input value={contact.last_name} onChange={event=>setContact(current=>({...current,last_name:event.target.value}))} placeholder="姓氏"/></FormField>
            <FormField label="工作职位"><Input value={contact.job_title} onChange={event=>setContact(current=>({...current,job_title:event.target.value}))} placeholder="职位"/></FormField>
            <FormField label="部门"><Input value={contact.department} onChange={event=>setContact(current=>({...current,department:event.target.value}))} placeholder="部门"/></FormField>
          </div>
          <div className="rounded-lg bg-muted/25 p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">联系方式</h3><p className="text-xs text-muted-foreground">每条联系方式独立保存，可重复添加相同平台。</p></div><Button variant="outline" size="sm" onClick={addMethod}><Plus className="h-4 w-4"/>添加联系方式</Button></div>
            {methodsDraft.map((item,index)=><div key={item.draftId} className="grid min-w-0 gap-2 rounded-md bg-background p-3 sm:grid-cols-2 lg:grid-cols-[150px_170px_minmax(0,1fr)_150px_auto]">
              <FormField label="类型"><Combobox value={item.method_type} onValueChange={value=>{const type=value as MethodType;updateMethod(item.draftId,{method_type:type,platform:platformOptions[type][0]?.value ?? "other"});}} options={typeOptions}/></FormField>
              <FormField label="平台"><Combobox value={item.platform} onValueChange={value=>updateMethod(item.draftId,{platform:value})} options={platformOptions[item.method_type]}/></FormField>
              <FormField label="账号 / 地址"><Input value={item.value} onChange={event=>updateMethod(item.draftId,{value:event.target.value})} placeholder={item.method_type==="email"?"name@example.com":item.method_type==="mobile"||item.method_type==="phone"?"国际区号 + 电话号码":"账号名称或个人主页 URL"}/></FormField>
              <FormField label="备注"><Input value={item.label} onChange={event=>updateMethod(item.draftId,{label:event.target.value})} placeholder="工作账号"/></FormField>
              <div className="flex items-end gap-2 pb-1"><Button type="button" size="icon" variant={item.is_primary?"default":"outline"} aria-label="设为主要联系方式" title="设为主要联系方式" onClick={()=>updateMethod(item.draftId,{is_primary:!item.is_primary})}><Star className="h-4 w-4"/></Button><Button type="button" size="icon" variant="ghost" aria-label="删除联系方式" onClick={()=>removeMethod(item.draftId)}><Trash2 className="h-4 w-4"/></Button></div>
              <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-5"><span className="flex items-center gap-2 text-xs text-muted-foreground">{iconFor(item.platform)}{methodName(item)}</span>{item.is_primary&&<Badge>主要</Badge>}<span className="text-xs text-muted-foreground">第 {index+1} 条</span></div>
            </div>)}
          </div>
          <FormField label="备注"><Textarea value={contact.notes} onChange={event=>setContact(current=>({...current,notes:event.target.value}))} placeholder="联系人背景、沟通偏好和其他信息"/></FormField>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setShowEditor(false)} disabled={saving}>取消</Button><Button onClick={()=>void save()} disabled={saving}>{saving?"正在保存…":"保存联系人"}</Button></div>
        </CardContent>
      </Card>}
      <Card><CardHeader><CardTitle>联系人列表 · {visible.length}</CardTitle><CardDescription>联系方式按图标展示；支持同一联系人拥有多个同类型账号。</CardDescription></CardHeader><CardContent className="space-y-3">
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">正在加载联系人…</p> : visible.length ? <div className="grid gap-2">{visible.map(row=>{
          const rowMethods = methods.filter(item=>(item as ContactMethod & {contact_id?:string}).contact_id===row.id);
          const legacyValues = [row.email,row.phone,row.mobile,row.whatsapp,row.linkedin_url].filter(Boolean);
          return <article key={row.id} className="min-w-0 rounded-lg bg-muted/25 p-3 sm:p-4">
            <div className="flex min-w-0 items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background"><UserRound className="h-5 w-5 text-muted-foreground"/></div><div className="min-w-0"><h3 className="break-words font-semibold">{String(row.full_name ?? [row.first_name,row.last_name].filter(Boolean).join(" ") || "未命名联系人")}</h3><p className="break-words text-sm text-muted-foreground">{String(row.job_title ?? "未设置职位")} · {accountName(String(row.account_id ?? ""))}</p></div></div><div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" aria-label="编辑联系人" onClick={()=>void startEdit(row)}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label="归档联系人" onClick={()=>void archive(row)}><Trash2 className="h-4 w-4"/></Button></div></div>
            <div className="mt-3 flex flex-wrap gap-2">{rowMethods.length ? rowMethods.map(item=><span key={item.id} className="inline-flex max-w-full items-center gap-2 rounded-md bg-background px-2.5 py-1.5 text-xs"><span className="shrink-0">{iconFor(item.platform,"h-3.5 w-3.5")}</span><span className="break-all">{item.value}</span>{item.is_primary&&<Badge className="shrink-0">主要</Badge>}</span>) : legacyValues.map((value,index)=><span key={index} className="rounded-md bg-background px-2.5 py-1.5 text-xs break-all">{String(value)}</span>)}</div>
          </article>;
        })}</div> : <div className="py-12 text-center text-sm text-muted-foreground">暂无联系人，点击「新建联系人」开始添加。</div>}
      </CardContent></Card>
    </div>
  );
}
