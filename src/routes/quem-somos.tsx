import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/InfoPage";

export const Route = createFileRoute("/quem-somos")({
  head: () =>
    infoHead(
      "/quem-somos",
      "Quem somos",
      "O Canal Transforma é um portal de jornalismo local de Catanduva que verifica, explica e acompanha os fatos.",
    ),
  component: AboutPage,
});

function AboutPage() {
  return (
    <InfoPage
      eyebrow="Sobre o Canal"
      title="Quem somos"
      intro="O Canal Transforma é um portal de jornalismo local feito em Catanduva, para Catanduva. Nossa promessa: a notícia que aproxima a cidade da verdade."
    >
      <h2>O que fazemos</h2>
      <p>
        Verificamos, explicamos e acompanhamos o que acontece na cidade. Cobrimos quatro áreas:
        Cidade, Política, Serviços e Esportes, além de lives semanais no YouTube com conversas sobre
        os assuntos que movimentam Catanduva.
      </p>
      <h2>Por que existimos</h2>
      <p>
        Boato espalha rápido, principalmente no WhatsApp. O Canal Transforma nasceu para combater a
        desinformação local: antes de publicar, apuramos com as fontes, ouvimos os lados envolvidos
        e mostramos de onde vem cada informação.
      </p>
      <h2>Como trabalhamos</h2>
      <p>
        Toda matéria escrita por um repórter passa pela revisão de um editor antes de ir ao ar.
        Quando erramos, corrigimos de forma visível, com a data da correção no fim da matéria. As
        regras completas estão na nossa <Link to="/politica-editorial">política editorial</Link>.
      </p>
      <h2>Fale com a redação</h2>
      <p>
        Viu algo que merece ser apurado? <Link to="/fale-conosco">Envie sua pauta</Link> ou escreva
        para <a href="mailto:contato@canaltransforma.com.br">contato@canaltransforma.com.br</a>.
        Conheça quem faz o portal no <Link to="/expediente">expediente</Link>.
      </p>
    </InfoPage>
  );
}
