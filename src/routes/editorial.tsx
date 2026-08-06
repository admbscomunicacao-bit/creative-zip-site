import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/editorial")({
  head: () => ({
    meta: [
      { title: "Área editorial — Canal Transforma" },
      {
        name: "description",
        content:
          "Acesso restrito da redação do Canal Transforma para criar, revisar e administrar publicações.",
      },
      { property: "og:title", content: "Área editorial — Canal Transforma" },
      {
        property: "og:description",
        content: "Entre com suas credenciais para acessar a redação do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Editorial,
});

function Editorial() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <SiteHeader />
      <section className="login-shell">
        <Link to="/" className="back-link">
          ← Voltar para o portal
        </Link>
        <div className="login-intro">
          <p className="eyebrow">Área editorial</p>
          <h1>Seu acesso começa aqui.</h1>
          <p>
            Entre com suas credenciais para criar, revisar e administrar as publicações do Canal
            Transforma.
          </p>
        </div>
        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <label>
            E-mail ou usuário
            <input
              type="text"
              placeholder="seuemail@canaltransforma.com.br"
              required
              name="email"
            />
          </label>
          <label>
            Senha
            <input type="password" placeholder="Digite sua senha" required name="password" />
          </label>
          <button className="login-submit" type="submit">
            Entrar na área editorial <b>→</b>
          </button>
          {sent && (
            <p className="login-message">
              O acesso da redação ainda não está ativo neste ambiente.
            </p>
          )}
        </form>
      </section>
      <SiteFooter />
    </>
  );
}
