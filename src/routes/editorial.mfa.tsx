import { createFileRoute, redirect } from "@tanstack/react-router";

/** Rota antiga do MFA por QR Code — agora a verificação é por código de e-mail. */
export const Route = createFileRoute("/editorial/mfa")({
  beforeLoad: () => {
    throw redirect({ to: "/editorial/seguranca" });
  },
});
