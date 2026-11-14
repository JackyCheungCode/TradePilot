import { useState, type FormEvent } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/shared/ui/primitives";
import { getSupabaseClient } from "@/shared/lib/supabase";
import tradePilotLogo from "@/assets/tradepilot-logo.svg";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败，请检查邮箱和密码");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-10">
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader className="space-y-4">
        <img src={tradePilotLogo} alt="TradePilot" className="h-auto w-56 max-w-full object-contain" />
        <div><CardTitle className="text-2xl">登录 TradePilot</CardTitle><CardDescription className="mt-2">登录后直接进入你的全球市场情报工作区。</CardDescription></div>
      </CardHeader>
      <CardContent><form onSubmit={signIn} className="space-y-4">
        <div className="space-y-2"><label htmlFor="tradepilot-email" className="text-sm font-medium">邮箱</label><Input id="tradepilot-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="输入登录邮箱" required /></div>
        <div className="space-y-2"><label htmlFor="tradepilot-password" className="text-sm font-medium">密码</label><Input id="tradepilot-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入账户密码" required /></div>
        <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}{submitting ? "正在登录…" : "登录并进入系统"}</Button>
        <p className="text-center text-xs text-muted-foreground">单用户工作空间 · 不开放注册</p>
      </form></CardContent>
    </Card>
  </main>;
}
