import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade | Canal Transforma" },
      {
        name: "description",
        content: "Como o Canal Transforma trata dados pessoais, cookies e anúncios no portal.",
      },
      { property: "og:title", content: "Política de privacidade | Canal Transforma" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.canaltransforma.com.br/privacidade" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <article className="article-shell legal-page">
        <Link to="/" className="back-link">
          ← Voltar para a capa
        </Link>
        <p className="eyebrow">Transparência</p>
        <h1>Política de privacidade</h1>
        <p className="article-summary">
          O que o Canal Transforma coleta quando você lê o portal, por que coleta e como você
          controla isso, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
        <div className="article-body">
          <h2>Leitura do portal</h2>
          <p>
            Para ler as reportagens você não precisa se cadastrar. O servidor registra dados
            técnicos de acesso, como endereço IP, navegador e páginas visitadas, para manter o site
            seguro e funcionando.
          </p>
          <h2>Cookies e anúncios</h2>
          <p>
            O portal exibe anúncios do Google AdSense. O Google e seus parceiros usam cookies para
            mostrar anúncios com base em visitas anteriores a este e a outros sites. Você pode
            desativar a publicidade personalizada nas{" "}
            <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">
              configurações de anúncios do Google
            </a>{" "}
            e saber mais em{" "}
            <a
              href="https://policies.google.com/technologies/ads?hl=pt-BR"
              target="_blank"
              rel="noreferrer"
            >
              como o Google usa cookies em publicidade
            </a>
            .
          </p>
          <h2>Vídeos do YouTube</h2>
          <p>
            Os vídeos usam o modo de privacidade aprimorada do YouTube: o player só é carregado, e
            os cookies do YouTube só são gravados, quando você clica para assistir.
          </p>
          <h2>Área editorial</h2>
          <p>
            Nome, e-mail e telefone de repórteres e editores são usados apenas para dar acesso ao
            painel da redação e identificar a autoria das reportagens.
          </p>
          <h2>Seus direitos</h2>
          <p>
            Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail{" "}
            <a href="mailto:canaltransformaa@gmail.com">canaltransformaa@gmail.com</a>.
          </p>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
