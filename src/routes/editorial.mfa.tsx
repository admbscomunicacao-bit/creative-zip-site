import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { EditorialShell, useEditorialAccount } from "@/components/editorial-shell";
import { supabase } from "@/integrations/supabase/client";
import { markMfaEnrolled } from "@/lib/editorial.functions";

export const Route = createFileRoute("/editorial/mfa")({
  head: () => ({
    meta: [
      { title: "Verificação em duas etapas — Canal Transforma" },
      {
        name: "description",
        content:
          "Configure a verificação em duas etapas com aplicativo autenticador para acessar a redação.",
      },
      { property: "og:title", content: "Verificação em duas etapas — Canal Transforma" },
      {
        property: "og:description",
        content: "MFA obrigatório por aplicativo autenticador na redação do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MfaSetup,
});

function MfaSetup() {
  const navigate = useNavigate();
  const { data: account, isLoading, refetch } = useEditorialAccount();
  const flagEnrolled = useServerFn(markMfaEnrolled);

  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!account) {
      void navigate({ to: "/editorial" });
      return;
    }
    if (account.status !== "approved") {
      void navigate({ to: "/editorial/perfil" });
    }
  }, [account, isLoading, navigate]);

  const start = async () => {
    setError("");
    setBusy(true);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Canal Transforma ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollError) {
        setError(enrollError.message);
        return;
      }
      setEnroll({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    setError("");
    setBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: enroll.id });
      if (challenge.error) {
        setError(challenge.error.message);
        return;
      }
      const verify = await supabase.auth.mfa.verify({
        factorId: enroll.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) {
        setError("Código inválido. Confira o aplicativo autenticador e tente novamente.");
        return;
      }
      await flagEnrolled();
      setInfo("Verificação em duas etapas ativada.");
      await refetch();
      await navigate({ to: "/editorial/redacao" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorialShell
      eyebrow="Área editorial"
      title="Verificação em duas etapas"
      intro="Use Google Authenticator, Authy, 1Password ou outro app TOTP. A redação só é liberada com o segundo fator validado."
      backTo="/editorial/perfil"
      backLabel="← Voltar para o perfil"
    >
      <div className="login-form">
        {!enroll ? (
          <>
            <p className="password-hint">
              Ao continuar, geramos um QR Code exclusivo para sua conta. Guarde também a chave de
              backup em local seguro. Não usamos SMS como fator único.
            </p>
            <button className="login-submit" type="button" onClick={start} disabled={busy}>
              {busy ? "Gerando..." : "Gerar QR Code"} <b>→</b>
            </button>
          </>
        ) : (
          <form onSubmit={confirm} className="mfa-enroll">
            <img className="mfa-qr" src={enroll.qr} alt="QR Code para configurar o autenticador" />
            <p className="password-hint">
              Não consegue escanear? Digite a chave manualmente: <code>{enroll.secret}</code>
            </p>
            <label>
              Código do aplicativo
              <input
                className="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
            </label>
            <button className="login-submit" type="submit" disabled={busy}>
              {busy ? "Confirmando..." : "Confirmar ativação"} <b>→</b>
            </button>
          </form>
        )}
        {info && <p className="login-message">{info}</p>}
        {error && <p className="login-message login-error">{error}</p>}
      </div>
    </EditorialShell>
  );
}
