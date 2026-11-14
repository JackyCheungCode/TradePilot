import { useState, type FormEvent } from "react";
import { Locked as LockKeyhole } from "@carbon/icons-react";
import {
  Button,
  Column,
  Grid,
  Heading,
  PasswordInput,
  Section,
  Stack,
  TextInput,
  Tile,
} from "@carbon/react";
import { toast } from "sonner";
import { getSupabaseClient } from "@/shared/lib/supabase";
import tradePilotLogo from "@/assets/tradepilot-logo.svg";
import "./login-page.scss";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败，请检查邮箱和密码");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="tp-login-page">
      <Grid fullWidth className="tp-login-grid">
        <Column sm={4} md={6} lg={6} xlg={6} max={6} className="tp-login-column">
          <Tile className="tp-login-tile">
            <Stack gap={7}>
              <img src={tradePilotLogo} alt="TradePilot" className="tp-login-logo" />
              <Section level={1}>
                <Stack gap={3}>
                  <Heading className="cds--type-productive-heading-04">登录 TradePilot</Heading>
                  <p className="cds--type-body-compact-01">
                    登录后直接进入你的全球市场情报工作区。
                  </p>
                </Stack>
              </Section>
              <form onSubmit={signIn} className="tp-login-form">
                <Stack gap={5}>
                  <TextInput
                    id="tradepilot-email"
                    type="email"
                    labelText="邮箱"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                    placeholder="输入登录邮箱"
                    required
                  />
                  <PasswordInput
                    id="tradepilot-password"
                    labelText="密码"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    placeholder="输入账户密码"
                    required
                  />
                  <Button
                    type="submit"
                    className="tp-login-submit"
                    renderIcon={LockKeyhole}
                    disabled={submitting}
                  >
                    {submitting ? "正在登录…" : "登录并进入系统"}
                  </Button>
                  <p className="cds--type-helper-text-01 tp-login-footnote">
                    单用户工作空间 · 不开放注册
                  </p>
                </Stack>
              </form>
            </Stack>
          </Tile>
        </Column>
      </Grid>
    </main>
  );
}
