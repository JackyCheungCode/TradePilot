import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, CircleHelp, Cloud, Database, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Save, ShieldCheck, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Separator } from "@/shared/ui/primitives";
import { integrationsApi, type IntegrationStatus, type IntegrationTestResult } from "../../infrastructure/integrations-api";
import { getSupabaseClient } from "@/shared/lib/supabase";

const services = [
  { key: "cloudflare" as const, title: "Cloudflare", description: "Worker 部署、运行环境与密钥托管", secretName: "CLOUDFLARE_API_TOKEN", icon: Cloud },
  { key: "supabase" as const, title: "Supabase", description: "后台数据库访问与线索持久化", secretName: "SUPABASE_SERVICE_ROLE_KEY", icon: Database },
  { key: "googleMaps" as const, title: "Google Maps Platform", description: "Google Places 本地商家搜索", secretName: "GOOGLE_MAPS_API_KEY", icon: KeyRound },
];

export function IntegrationsSettingsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [tests, setTests] = useState<Record<string, IntegrationTestResult> | null>(null);
  const [cloudflareApiToken, setCloudflareApiToken] = useState("");
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState("");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const refreshStatus = useCallback(async () => {
    try { setStatus(await integrationsApi.getStatus()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "无法读取集成状态"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void getSupabaseClient().auth.getSession().then(async ({ data }) => {
      if (data.session) { setAuthenticated(true); await refreshStatus(); }
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, [refreshStatus]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSigningIn(true);
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthenticated(true); setPassword(""); setLoading(true); await refreshStatus(); toast.success("登录成功");
    } catch (error) { toast.error(error instanceof Error ? error.message : "登录失败，请检查邮箱和密码"); }
    finally { setSigningIn(false); }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!status?.cloudflare && !cloudflareApiToken.trim()) { toast.error("首次配置需要填写 Cloudflare API Token。"); return; }
    if (!status?.supabase && !supabaseServiceRoleKey.trim()) { toast.error("请填写 Supabase Service Role Key。"); return; }
    if (!status?.googleMaps && !googleMapsApiKey.trim()) { toast.error("请填写 Google Maps API Key。"); return; }
    setSaving(true);
    try {
      const result = await integrationsApi.save({ cloudflareApiToken, supabaseServiceRoleKey, googleMapsApiKey });
      toast.success(result.message);
      setCloudflareApiToken(""); setSupabaseServiceRoleKey(""); setGoogleMapsApiKey("");
      await refreshStatus();
      setTests(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "密钥保存失败"); }
    finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    try {
      const result = await integrationsApi.test();
      setTests(result);
      const passed = Object.values(result).filter((item) => item.ok).length;
      toast[passed === 3 ? "success" : "warning"](`连接测试完成：${passed}/3 项通过`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "连接测试失败"); }
    finally { setTesting(false); }
  };

  const fields = [
    { id: "cloudflare", label: "Cloudflare API Token", value: cloudflareApiToken, set: setCloudflareApiToken, placeholder: status?.cloudflare ? "已配置，留空表示保持不变" : "粘贴 Cloudflare API Token", hint: "需要 Workers Scripts Write 权限，建议仅授权 TradePilot 所在账户。" },
    { id: "supabase", label: "Supabase Service Role Key", value: supabaseServiceRoleKey, set: setSupabaseServiceRoleKey, placeholder: status?.supabase ? "已配置，留空表示保持不变" : "粘贴 Supabase service_role 密钥", hint: "仅在 Worker 服务端使用，拥有高权限，请勿将其用于浏览器客户端。" },
    { id: "googleMaps", label: "Google Maps API Key", value: googleMapsApiKey, set: setGoogleMapsApiKey, placeholder: status?.googleMaps ? "已配置，留空表示保持不变" : "粘贴 Google Maps API Key", hint: "请启用 Places API (New)，并配置账单和 API 限制。" },
  ];

  if (!authenticated) return <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10"><Card className="w-full max-w-md">
      <CardHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><LockKeyhole className="h-5 w-5" /></div><CardTitle>登录 TradePilot</CardTitle><CardDescription>登录后才能安全管理系统集成密钥。</CardDescription></CardHeader>
      <CardContent><form onSubmit={signIn} className="space-y-4">
        <div className="space-y-2"><label htmlFor="settings-email" className="text-sm font-medium">邮箱</label><Input id="settings-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="space-y-2"><label htmlFor="settings-password" className="text-sm font-medium">密码</label><Input id="settings-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        <Button type="submit" className="w-full" disabled={signingIn}>{signingIn ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}登录</Button>
      </form></CardContent>
    </Card></div>;

  return <div className="min-h-screen bg-background">
    <header className="border-b bg-card/70 px-6 py-5">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><KeyRound className="h-5 w-5" /></div>
        <div><h1 className="text-xl font-semibold tracking-tight">设置与集成</h1><p className="text-sm text-muted-foreground">管理 TradePilot 连接的外部服务与 API 凭据</p></div>
      </div>
    </header>
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="grid gap-3 md:grid-cols-3">
        {services.map((service) => {
          const configured = status?.[service.key] ?? false;
          const Icon = service.icon;
          return <Card key={service.key} className="border-0 bg-muted/40 shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background"><Icon className="h-5 w-5 text-muted-foreground" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">{service.title}</p><p className="text-xs text-muted-foreground">{service.secretName}</p></div>
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : <Badge variant={configured ? "success" : "outline"}>{configured ? "已配置" : "未配置"}</Badge>}
            </CardContent>
          </Card>;
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" /><CardTitle>API 密钥</CardTitle></div>
          <CardDescription>输入密钥并保存到 Cloudflare Worker Secrets。已保存的密钥不会再次显示。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={save}>
            {fields.map((field, index) => <div key={field.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3"><label htmlFor={field.id} className="text-sm font-medium">{field.label}</label>{status?.[field.id === "googleMaps" ? "googleMaps" : field.id] && <Badge variant="success">已安全保存</Badge>}</div>
              <div className="relative">
                <Input id={field.id} type={show[field.id] ? "text" : "password"} autoComplete="new-password" value={field.value} onChange={(event) => field.set(event.target.value)} placeholder={field.placeholder} className="pr-12 font-mono text-sm" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShow((current) => ({ ...current, [field.id]: !current[field.id] }))} aria-label={show[field.id] ? "隐藏密钥" : "显示密钥"}>{show[field.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
              </div>
              <p className="text-xs text-muted-foreground">{field.hint}</p>
              {index < fields.length - 1 && <Separator className="mt-5" />}
            </div>)}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-4">
              <div className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>密钥通过登录态保护的 Worker 接口提交，并写入 Cloudflare Secrets。前端不会持久化或回显密钥。</span></div>
              <Button type="submit" disabled={saving || loading}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "正在安全保存…" : "保存密钥"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex items-center gap-2"><TestTube2 className="h-5 w-5" /><CardTitle>连接测试</CardTitle></div><CardDescription>保存密钥后，验证 Cloudflare、Supabase 与 Google Places API 是否可以正常访问。</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Google Places 测试会发起一次小型搜索请求，可能计入 Google API 用量。</p><Button type="button" variant="outline" onClick={test} disabled={testing || loading || !status || !Object.values(status).every(Boolean)}>{testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}测试所有连接</Button></div>
          {tests && <div className="space-y-2">{services.map((service) => {
            const result = tests[service.key];
            return <div key={service.key} className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2.5 text-sm"><span>{result?.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-destructive" />}</span><span className="font-medium">{service.title}</span><span className="ml-auto text-xs text-muted-foreground">{result?.message ?? "未测试"}</span></div>;
          })}</div>}
          <div className="flex items-start gap-2 text-xs text-muted-foreground"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />如测试失败，请检查密钥有效性、Cloudflare 权限、Google Places API 启用状态及账单配置。</div>
        </CardContent>
      </Card>
    </main>
  </div>;
}
