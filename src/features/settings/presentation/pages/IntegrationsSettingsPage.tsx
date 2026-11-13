import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Cloud, Database, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, Save, ShieldCheck, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/shared/ui/primitives";
import { integrationsApi, type IntegrationService, type IntegrationStatus, type IntegrationTestResult } from "../../infrastructure/integrations-api";

const services: Array<{
  key: IntegrationService;
  title: string;
  description: string;
  secretName: string;
  placeholder: string;
  hint: string;
  icon: typeof Cloud;
}> = [
  { key: "cloudflare", title: "Cloudflare", description: "Worker 部署与服务端密钥托管", secretName: "CLOUDFLARE_API_TOKEN", placeholder: "粘贴 Cloudflare API Token", hint: "需要 Workers Scripts Write 权限。请先配置此密钥，后续服务密钥由它安全写入 Worker Secrets。", icon: Cloud },
  { key: "supabase", title: "Supabase", description: "后台数据库访问与线索持久化", secretName: "SUPABASE_SERVICE_ROLE_KEY", placeholder: "粘贴 Supabase Service Role Key", hint: "仅在 Worker 服务端使用，拥有高权限，请勿将其用于浏览器客户端。", icon: Database },
  { key: "googleMaps", title: "Google Maps Platform", description: "Google Places 本地商家搜索", secretName: "GOOGLE_MAPS_API_KEY", placeholder: "粘贴 Google Maps API Key", hint: "请启用 Places API (New)，并配置账单和 API 限制。", icon: KeyRound },
];

export function IntegrationsSettingsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [credentials, setCredentials] = useState<Record<IntegrationService, string>>({ cloudflare: "", supabase: "", googleMaps: "" });
  const [visible, setVisible] = useState<Record<IntegrationService, boolean>>({ cloudflare: false, supabase: false, googleMaps: false });
  const [tests, setTests] = useState<Partial<Record<IntegrationService, IntegrationTestResult>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Partial<Record<IntegrationService, boolean>>>({});
  const [testing, setTesting] = useState<Partial<Record<IntegrationService, boolean>>>({});

  const refreshStatus = async () => {
    try { setStatus(await integrationsApi.getStatus()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "无法读取集成状态"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refreshStatus(); }, []);

  const save = async (service: IntegrationService) => {
    const value = credentials[service].trim();
    if (!value) { toast.error("请先输入要保存的新密钥。"); return; }
    setSaving((current) => ({ ...current, [service]: true }));
    try {
      const result = await integrationsApi.save(service, value);
      setCredentials((current) => ({ ...current, [service]: "" }));
      setTests((current) => ({ ...current, [service]: undefined }));
      toast.success(result.message);
      await refreshStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "密钥保存失败");
    } finally {
      setSaving((current) => ({ ...current, [service]: false }));
    }
  };

  const test = async (service: IntegrationService) => {
    setTesting((current) => ({ ...current, [service]: true }));
    try {
      const result = await integrationsApi.test(service);
      setTests((current) => ({ ...current, [service]: result }));
      toast[result.ok ? "success" : "error"](`${services.find((item) => item.key === service)?.title}：${result.message}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "连接测试失败");
    } finally {
      setTesting((current) => ({ ...current, [service]: false }));
    }
  };

  return <div className="min-h-screen bg-background">
    <header className="border-b bg-card/70 px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><KeyRound className="h-5 w-5" /></div>
        <div><h1 className="text-xl font-semibold tracking-tight">设置与集成</h1><p className="text-sm text-muted-foreground">每项服务独立配置、保存和测试</p></div>
      </div>
    </header>
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>密钥只提交到登录态保护的 Worker 接口，并保存为 Cloudflare Worker Secrets。已保存的密钥不会回显，也不会存入浏览器本地存储。</span></div>
      {services.map((service) => {
        const Icon = service.icon;
        const configured = status?.[service.key] ?? false;
        const testResult = tests[service.key];
        return <Card key={service.key}>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className="h-5 w-5 text-muted-foreground" /></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><CardTitle>{service.title}</CardTitle>{loading ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : <Badge variant={configured ? "success" : "outline"}>{configured ? "已配置" : "未配置"}</Badge>}</div><CardDescription className="mt-1">{service.description} · {service.secretName}</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor={`key-${service.key}`} className="text-sm font-medium">{service.title} API Key</label>
              <div className="relative">
                <Input id={`key-${service.key}`} type={visible[service.key] ? "text" : "password"} autoComplete="new-password" value={credentials[service.key]} onChange={(event) => setCredentials((current) => ({ ...current, [service.key]: event.target.value }))} placeholder={configured ? "已配置；输入新密钥可替换" : service.placeholder} className="pr-12 font-mono text-sm" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setVisible((current) => ({ ...current, [service.key]: !current[service.key] }))} aria-label={visible[service.key] ? "隐藏密钥" : "显示密钥"}>{visible[service.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
              </div>
              <p className="text-xs text-muted-foreground">{service.hint}</p>
              {service.key !== "cloudflare" && !status?.cloudflare && <p className="text-xs text-amber-700 dark:text-amber-400">需要先保存 Cloudflare API Token，才能安全写入此密钥。</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => void save(service.key)} disabled={loading || saving[service.key] || !credentials[service.key].trim()}>
                {saving[service.key] ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving[service.key] ? "正在保存…" : "单独保存"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void test(service.key)} disabled={loading || testing[service.key] || !configured}>
                {testing[service.key] ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}{testing[service.key] ? "正在测试…" : "连接测试"}
              </Button>
              {testResult && <div className="flex min-w-0 items-center gap-1.5 text-xs" role="status">{testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}<span className={testResult.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>{testResult.message}</span></div>}
            </div>
          </CardContent>
        </Card>;
      })}
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-4 w-4" />每次操作只会修改当前服务，不会覆盖其他服务的密钥。</div>
    </main>
  </div>;
}
