import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/InfoPage";

export const Route = createFileRoute("/politica-editorial")({
  head: () =>
    infoHead(
      "/politica-editorial",
      "Política editorial e de correções",
      "Como o Canal Transforma apura, revisa, publica e corrige as notícias de Catanduva.",
    ),
  component: EditorialPolicyPage,
});

function EditorialPolicyPage() {
  return (
    <InfoPage
      eyebrow="Transparência"
      title="Política editorial e de correções"
      intro="As regras que seguimos para apurar, publicar e corrigir. Elas valem para todas as matérias do portal."
    >
      <h2>Apuração</h2>
      <ul>
        <li>Toda informação publicada é confirmada com pelo menos uma fonte identificável.</li>
        <li>
          Quando um assunto envolve críticas a alguém, procuramos ouvir a pessoa ou o órgão citado.
        </li>
        <li>
          Separamos fato de opinião. Quando um texto for de opinião, isso estará escrito nele.
        </li>
        <li>Não publicamos boatos para desmenti-los sem antes checar o que é verdade.</li>
      </ul>
      <h2>Revisão antes de publicar</h2>
      <p>
        Repórteres escrevem e enviam a matéria para revisão. Um editor confere a apuração, o texto e
        as imagens antes de publicar. Fotos levam crédito de quem fez a imagem.
      </p>
      <h2>Correções</h2>
      <p>
        Errou, corrige. Quando uma matéria publicada tem um erro de informação, nós a corrigimos e
        registramos no fim do texto o que mudou e quando. Ajustes de digitação que não mudam o
        sentido são feitos sem aviso.
      </p>
      <p>
        Encontrou um erro? Use o formulário de <Link to="/fale-conosco">contato</Link> e escolha
        “Pedido de correção”, ou escreva para{" "}
        <a href="mailto:contato@canaltransforma.com.br">contato@canaltransforma.com.br</a>.
      </p>
      <h2>Anúncios e independência</h2>
      <p>
        O portal pode exibir anúncios automáticos do Google. Anúncios não interferem na escolha nem
        no conteúdo das matérias.
      </p>
      <h2>Comentários e redes sociais</h2>
      <p>
        Nas nossas redes, apagamos comentários com ofensas, discurso de ódio, dados pessoais de
        terceiros ou informações falsas.
      </p>
    </InfoPage>
  );
}
