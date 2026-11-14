import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Upload, UserRoundPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Combobox, Input, Textarea } from "@/shared/ui/primitives";
import { FormField, FormSection } from "@/shared/ui/data-views";
import { CountrySelect } from "@/features/lead-discovery/presentation/components/CountrySelect";
import { RegionCityPicker } from "@/features/lead-discovery/presentation/components/RegionCityPicker";
import { getSupabaseClient } from "@/shared/lib/supabase";
import { masterDataApi, type MasterRecord } from "../../infrastructure/master-data-api";

type CustomerTab = "contacts" | "sales" | "finance" | "notes";
type ContactDraft = {
  id?: string;
  draftId: string;
  name: string;
  job_title: string;
  email: string;
  phone: string;
  mobile: string;
};
type CustomerForm = {
  account_name: string;
  parent_account_id: string;
  email: string;
  phone: string;
  country_code: string;
  region: string;
  city: string;
  street: string;
  postal_code: string;
  tax_number: string;
  job_title: string;
  website: string;
  logo_url: string;
  sales_person: string;
  payment_terms: string;
  payment_method: string;
  incoterms_code: string;
  bank_name: string;
  bank_account: string;
  notes: string;
};
const emptyCustomer: CustomerForm = {
  account_name: "", parent_account_id: "", email: "", phone: "", country_code: "", region: "", city: "",
  street: "", postal_code: "", tax_number: "", job_title: "", website: "", logo_url: "",
  sales_person: "", payment_terms: "", payment_method: "", incoterms_code: "",
  bank_name: "", bank_account: "", notes: "",
};
const tabs: Array<{ key: CustomerTab; label: string }> = [
  { key: "contacts", label: "联系人" },
  { key: "sales", label: "销售" },
  { key: "finance", label: "财务" },
  { key: "notes", label: "备注" },
];
const makeDraftId = () => "draft-" + crypto.randomUUID();
const accountValue = (record: MasterRecord | null | undefined, key: keyof CustomerForm) => {
  const value = record?.[key];
  return value === null || value === undefined ? "" : String(value);
};

export function CustomerAccountForm({
  initialRecord,
  accounts,
  onBack,
  onSaved,
}: {
  initialRecord?: MasterRecord | null;
  accounts: MasterRecord[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CustomerForm>(() => ({ ...emptyCustomer, ...Object.fromEntries(Object.keys(emptyCustomer).map((key) => [key, accountValue(initialRecord, key as keyof CustomerForm)])) } as CustomerForm));
  const [tags, setTags] = useState<string[]>(() => Array.isArray(initialRecord?.tags) ? (initialRecord.tags as string[]) : []);
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<CustomerTab>("contacts");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [removedContactIds, setRemovedContactIds] = useState<string[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showContactsFullScreen, setShowContactsFullScreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!initialRecord?.id) {
      setContacts([]);
      return;
    }
    setContactsLoading(true);
    void masterDataApi.list("crm/contacts", { account_id: initialRecord.id }).then((rows) => {
      if (!active) return;
      setContacts(rows.map((row) => ({
        id: row.id,
        draftId: row.id,
        name: String(row.full_name ?? [row.first_name, row.last_name].filter(Boolean).join(" ") ?? ""),
        job_title: String(row.job_title ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
        mobile: String(row.mobile ?? ""),
      })));
    }).catch((error: unknown) => {
      if (active) toast.error(error instanceof Error ? error.message : "读取联系人失败");
    }).finally(() => {
      if (active) setContactsLoading(false);
    });
    return () => { active = false; };
  }, [initialRecord?.id]);

  const parentOptions = useMemo(() => [
    { value: "", label: "无（顶级客户）" },
    ...accounts.filter((account) => account.id !== initialRecord?.id).map((account) => ({
      value: account.id,
      label: String(account.account_name ?? account.legal_name ?? account.id),
    })),
  ], [accounts, initialRecord?.id]);

  const update = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const addTag = () => {
    const value = tagInput.trim().replace(/,$/, "");
    if (!value) return;
    if (!tags.some((tag) => tag.toLocaleLowerCase() === value.toLocaleLowerCase())) setTags((current) => [...current, value]);
    setTagInput("");
  };
  const uploadLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("徽标只支持图片文件。"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("图片不能超过 5 MB。"); return; }
    setUploading(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.user.id) throw new Error("登录状态已失效，请重新登录。");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
      const objectPath = session.user.id + "/accounts/" + crypto.randomUUID() + "-" + safeName;
      const { error } = await getSupabaseClient().storage.from("crm-assets").upload(objectPath, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = getSupabaseClient().storage.from("crm-assets").getPublicUrl(objectPath);
      update("logo_url", data.publicUrl);
      toast.success("徽标上传成功。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "徽标上传失败");
    } finally {
      setUploading(false);
    }
  };
  const updateContact = (draftId: string, key: keyof Omit<ContactDraft, "id" | "draftId">, value: string) => {
    setContacts((current) => current.map((contact) => contact.draftId === draftId ? { ...contact, [key]: value } : contact));
  };
  const removeContact = (contact: ContactDraft) => {
    setContacts((current) => current.filter((item) => item.draftId !== contact.draftId));
    if (contact.id) setRemovedContactIds((current) => [...current, contact.id!]);
  };
  const save = async () => {
    if (!form.account_name.trim()) { toast.error("请填写客户名称。"); return; }
    if (uploading) { toast.error("徽标仍在上传，请稍候。"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        account_name: form.account_name.trim(),
        account_type: "customer",
        company_type: "company",
        parent_account_id: form.parent_account_id || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        country_code: form.country_code || null,
        region: form.region.trim() || null,
        city: form.city.trim() || null,
        street: form.street.trim() || null,
        postal_code: form.postal_code.trim() || null,
        tax_number: form.tax_number.trim() || null,
        job_title: form.job_title.trim() || null,
        website: form.website.trim() || null,
        logo_url: form.logo_url || null,
        tags,
        sales_person: form.sales_person.trim() || null,
        payment_terms: form.payment_terms.trim() || null,
        payment_method: form.payment_method.trim() || null,
        incoterms_code: form.incoterms_code || null,
        bank_name: form.bank_name.trim() || null,
        bank_account: form.bank_account.trim() || null,
        notes: form.notes.trim() || null,
      };
      const savedAccount = initialRecord?.id
        ? await masterDataApi.update("crm/accounts", initialRecord.id, payload)
        : await masterDataApi.create("crm/accounts", payload);
      for (const contact of contacts) {
        if (!contact.name.trim()) continue;
        const name = contact.name.trim();
        const contactPayload = {
          account_id: savedAccount.id,
          first_name: name,
          full_name: name,
          job_title: contact.job_title.trim() || null,
          email: contact.email.trim() || null,
          phone: contact.phone.trim() || null,
          mobile: contact.mobile.trim() || null,
        };
        if (contact.id) await masterDataApi.update("crm/contacts", contact.id, contactPayload);
        else await masterDataApi.create("crm/contacts", contactPayload);
      }
      for (const id of removedContactIds) await masterDataApi.remove("crm/contacts", id);
      toast.success(initialRecord?.id ? "客户资料已更新。" : "客户已创建。");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "客户保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (showContactsFullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex min-h-0 flex-col bg-background">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="outline" onClick={() => setShowContactsFullScreen(false)}><ArrowLeft className="h-4 w-4" />返回客户</Button>
            <div className="min-w-0"><h1 className="truncate text-lg font-semibold">联系人</h1><p className="text-xs text-muted-foreground">为当前客户添加和维护多位联系人</p></div>
          </div>
          <Button onClick={() => { setShowContactsFullScreen(false); setActiveTab("contacts"); }}>完成 <Badge className="ml-1">{contacts.length}</Badge></Button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold">联系人列表</h2><p className="mt-1 text-sm text-muted-foreground">联系人会在保存客户资料时一并保存。</p></div><Button onClick={() => setContacts((current) => [...current, { draftId: makeDraftId(), name: "", job_title: "", email: "", phone: "", mobile: "" }])}><Plus className="h-4 w-4" />添加联系人</Button></div>
            {contactsLoading ? <p className="py-8 text-center text-sm text-muted-foreground">正在读取联系人…</p> : contacts.length === 0 ? <div className="rounded-lg bg-muted/30 px-4 py-12 text-center"><UserRoundPlus className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="font-medium">还没有联系人</p><p className="mt-1 text-sm text-muted-foreground">点击「添加联系人」创建第一位联系人。</p></div> : contacts.map((contact, index) => (
              <section key={contact.draftId} className="rounded-lg bg-muted/25 p-4">
                <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span><h3 className="font-medium">联系人 {index + 1}</h3>{contact.id && <Badge variant="outline">已保存</Badge>}</div><Button size="icon" variant="ghost" aria-label="移除联系人" onClick={() => removeContact(contact)}><Trash2 className="h-4 w-4" /></Button></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="联系人姓名" required><Input value={contact.name} onChange={(event) => updateContact(contact.draftId, "name", event.target.value)} placeholder="姓名" /></FormField>
                  <FormField label="工作职位"><Input value={contact.job_title} onChange={(event) => updateContact(contact.draftId, "job_title", event.target.value)} placeholder="职位" /></FormField>
                  <FormField label="电子邮件"><Input type="email" value={contact.email} onChange={(event) => updateContact(contact.draftId, "email", event.target.value)} placeholder="name@company.com" /></FormField>
                  <FormField label="电话"><Input value={contact.phone} onChange={(event) => updateContact(contact.draftId, "phone", event.target.value)} placeholder="+..." /></FormField>
                  <FormField label="手机"><Input value={contact.mobile} onChange={(event) => updateContact(contact.draftId, "mobile", event.target.value)} placeholder="+..." /></FormField>
                </div>
              </section>
            ))}
          </div>
        </main>
        <footer className="shrink-0 border-t bg-background px-4 py-3 sm:px-6"><div className="mx-auto flex max-w-5xl justify-between gap-2"><Button variant="outline" onClick={() => setShowContactsFullScreen(false)}>返回客户表单</Button><Button onClick={() => setShowContactsFullScreen(false)}>完成联系人设置</Button></div></footer>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] min-w-0 space-y-5 p-3 sm:p-5 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">客户关系管理 / 客户</p><h1 className="mt-1 text-xl font-semibold tracking-tight">{initialRecord?.id ? "编辑客户" : "创建客户"}</h1><p className="mt-1 text-sm text-muted-foreground">维护客户主体资料、联系人、销售与财务信息。</p></div>
        <div className="flex shrink-0 gap-2"><Button variant="outline" onClick={onBack} disabled={saving}>取消</Button><Button onClick={() => void save()} disabled={saving || uploading}>{saving ? "正在保存…" : "保存客户"}</Button></div>
      </div>

      <section className="rounded-lg bg-card p-4 sm:p-6">
        <FormSection title="客户资料" description="先填写客户身份和主要联系信息。">
          <div className="grid min-w-0 gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="flex items-center gap-4 md:col-span-2">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {form.logo_url ? <img src={form.logo_url} alt="客户徽标" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">徽标</span>}
              </div>
              <div className="min-w-0 space-y-2"><p className="text-sm font-medium">徽标</p><label className="inline-flex cursor-pointer items-center gap-2 rounded-[4px] border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"><Upload className="h-3.5 w-3.5" />{uploading ? "正在上传…" : "上传图片"}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={uploading} onChange={(event) => { void uploadLogo(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label><p className="text-xs text-muted-foreground">PNG、JPG、WEBP 或 SVG，最大 5 MB。</p></div>
            </div>
            <FormField label="名称" required><Input autoFocus value={form.account_name} onChange={(event) => update("account_name", event.target.value)} placeholder="客户或公司名称" /></FormField>
            <FormField label="关联公司"><Combobox value={form.parent_account_id} onValueChange={(value) => update("parent_account_id", value)} options={parentOptions} placeholder="无（顶级客户）" searchPlaceholder="搜索公司名称…" /></FormField>
            <FormField label="电子邮件"><Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="name@company.com" /></FormField>
            <FormField label="电话"><Input type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+..." /></FormField>
            <div className="md:col-span-2"><CountrySelect value={form.country_code} onChange={(value) => setForm((current) => ({ ...current, country_code: value, region: "", city: "" }))} /></div>
            <div className="md:col-span-2"><RegionCityPicker countryCode={form.country_code} state={form.region} city={form.city} onStateChange={(value) => setForm((current) => ({ ...current, region: value, city: "" }))} onCityChange={(value) => update("city", value)} /></div>
            <FormField label="详细地址" className="md:col-span-2"><Input value={form.street} onChange={(event) => update("street", event.target.value)} placeholder="街道、门牌号、楼层等" /></FormField>
            <FormField label="邮政编码"><Input value={form.postal_code} onChange={(event) => update("postal_code", event.target.value)} placeholder="Postal code" /></FormField>
            <FormField label="税号 ID"><Input value={form.tax_number} onChange={(event) => update("tax_number", event.target.value)} placeholder="Tax ID / VAT Number" /></FormField>
            <FormField label="工作职位"><Input value={form.job_title} onChange={(event) => update("job_title", event.target.value)} placeholder="职位" /></FormField>
            <FormField label="网站"><Input type="url" value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="https://" /></FormField>
            <FormField label="标签" className="md:col-span-2"><div className="space-y-2"><div className="flex gap-2"><Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(); } }} placeholder="输入标签后按 Enter 添加" /><Button type="button" variant="outline" onClick={addTag}><Plus className="h-4 w-4" />添加</Button></div><div className="flex min-h-8 flex-wrap gap-2">{tags.map((tag) => <Badge key={tag} variant="secondary" className="gap-1 px-2 py-1">{tag}<button type="button" aria-label={"移除标签 " + tag} onClick={() => setTags((current) => current.filter((item) => item !== tag))}><X className="h-3 w-3" /></button></Badge>)}{tags.length === 0 && <span className="text-xs text-muted-foreground">尚未添加标签</span>}</div></div></FormField>
          </div>
        </FormSection>
      </section>

      <section className="overflow-hidden rounded-lg bg-card">
        <div role="tablist" aria-label="客户附加资料" className="flex gap-1 overflow-x-auto border-b px-3 pt-2 sm:px-5">
          {tabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className={"shrink-0 border-b-2 px-4 py-3 text-sm transition-colors " + (activeTab === tab.key ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{tab.label}</button>)}
        </div>
        <div role="tabpanel" className="min-h-[220px] p-4 sm:p-6">
          {activeTab === "contacts" && <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">联系人</h2><p className="mt-1 text-sm text-muted-foreground">一个客户可以关联多位联系人。</p></div><Button onClick={() => setShowContactsFullScreen(true)}><UserRoundPlus className="h-4 w-4" />全屏管理联系人 <Badge className="ml-1">{contacts.length}</Badge></Button></div>{contactsLoading ? <p className="py-5 text-sm text-muted-foreground">正在读取联系人…</p> : contacts.length ? <div className="space-y-2">{contacts.map((contact) => <div key={contact.draftId} className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium">{contact.name || "未命名联系人"}</p><p className="truncate text-xs text-muted-foreground">{[contact.job_title, contact.email, contact.phone].filter(Boolean).join(" · ") || "尚未填写联系方式"}</p></div><Badge variant="outline">{contact.id ? "已保存" : "待创建"}</Badge></div>)}</div> : <div className="rounded-md bg-muted/25 px-4 py-7 text-center text-sm text-muted-foreground">暂未添加联系人，可进入全屏窗口创建多位联系人。</div>}</div>}
          {activeTab === "sales" && <FormSection title="销售" description="设置客户负责人及默认交易条件。"><div className="grid gap-4 sm:grid-cols-2"><FormField label="销售员"><Input value={form.sales_person} onChange={(event) => update("sales_person", event.target.value)} placeholder="销售负责人" /></FormField><FormField label="付款条件"><Input value={form.payment_terms} onChange={(event) => update("payment_terms", event.target.value)} placeholder="例如：预付 30%，余款发货前支付" /></FormField><FormField label="付款方式"><Input value={form.payment_method} onChange={(event) => update("payment_method", event.target.value)} placeholder="T/T、L/C、信用卡等" /></FormField><FormField label="国际贸易术语"><Combobox value={form.incoterms_code} onValueChange={(value) => update("incoterms_code", value)} placeholder="选择 Incoterms" options={["EXW","FCA","CPT","CIP","DAP","DPU","DDP","FAS","FOB","CFR","CIF"].map((value) => ({ value, label: value }))} /></FormField></div></FormSection>}
          {activeTab === "finance" && <FormSection title="财务" description="维护客户收款或结算相关的银行信息。"><div className="grid gap-4 sm:grid-cols-2"><FormField label="银行"><Input value={form.bank_name} onChange={(event) => update("bank_name", event.target.value)} placeholder="银行名称" /></FormField><FormField label="银行账户"><Input value={form.bank_account} onChange={(event) => update("bank_account", event.target.value)} placeholder="银行账号" /></FormField></div></FormSection>}
          {activeTab === "notes" && <FormSection title="备注"><FormField label="内部备注"><Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="记录客户背景、沟通要点和特殊要求…" className="min-h-32" /></FormField></FormSection>}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={onBack} disabled={saving}>取消</Button><Button onClick={() => void save()} disabled={saving || uploading}>{saving ? "正在保存…" : "保存客户"}</Button></div>
    </div>
  );
}
