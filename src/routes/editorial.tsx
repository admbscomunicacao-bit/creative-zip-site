import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/editorial")({
  head: () => ({
    meta: [
      { title: "Área editorial — Canal Transforma" },
      {
        name: "description",
        content:
          "Acesso restrito da redação do Canal Transforma para repórteres e editores autorizados.",
      },
      { property: "og:title", content: "Área editorial — Canal Transforma" },
      {
        property: "og:description",
        content: "Acesso restrito da redação do Canal Transforma.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Editorial,
});

function Editorial() {
  return (
    <>
      <SiteHeader />
      <main className="editorial-login">
        <p className="eyebrow">Área restrita</p>
        <h1>Entre na área editorial</h1>
        <p>
          O login, o cadastro com confirmação por e-mail e a verificação em duas etapas serão
          conectados ao Lovable Cloud quando você pedir a ativação da autenticação.
        </p>
        <button>Entrar</button>
        <button className="outline">Criar conta</button>
      </main>
      <SiteFooter />
    </>
  );
}
