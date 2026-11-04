import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, infoHead } from "@/components/InfoPage";

export const Route = createFileRoute("/termos")({
  head: () =>
    infoHead(
      "/termos",
      "Termos de uso",
      "Regras para ler, compartilhar e reproduzir o conteúdo do Canal Transforma e para usar a área da redação.",
    ),
  component: TermsPage,
});

function TermsPage() {
  return (
    <InfoPage
      eyebrow="Transparência"
      title="Termos de uso"
      intro="As regras para quem lê, compartilha ou reproduz o conteúdo do Canal Transforma e para quem tem acesso à área da redação."
    >
      <h2>Leitura e compartilhamento</h2>
      <p>
        O portal é gratuito e não exige cadastro. Você pode compartilhar o link de qualquer matéria
        à vontade, pelos botões da própria página ou copiando o endereço.
      </p>
      <h2>Reprodução do conteúdo</h2>
      <p>
        Textos, fotos e vídeos publicados pelo Canal Transforma são protegidos pela Lei de Direitos
        Autorais (Lei 9.610/1998). Trechos podem ser citados com crédito ao Canal Transforma e link
        para a matéria original. A reprodução integral, ou de fotos e vídeos, depende de
        autorização por escrito, pedida pelo e-mail{" "}
        <a href="mailto:contato@canaltransforma.com.br">contato@canaltransforma.com.br</a>.
      </p>
      <h2>Correções</h2>
      <p>
        Trabalhamos para publicar só informação verificada. Se encontrar um erro, avise pela página{" "}
        <Link to="/fale-conosco">Envie sua pauta</Link>. Correções são registradas no fim da
        matéria, como explica a nossa <Link to="/politica-editorial">política editorial</Link>.
      </p>
      <h2>Mensagens enviadas à redação</h2>
      <p>
        Ao enviar uma pauta ou mensagem, você declara que as informações são verdadeiras até onde
        sabe. A redação decide de forma independente o que apura e publica, e preserva o sigilo da
        fonte quando pedido.
      </p>
      <h2>Área da redação</h2>
      <p>
        O acesso ao painel é pessoal e só vale depois da aprovação de um administrador. Quem tem
        conta responde pelo que escreve, não compartilha senha nem código de acesso e segue a
        política editorial. Contas podem ser suspensas em caso de uso indevido.
      </p>
      <h2>Anúncios e links externos</h2>
      <p>
        O portal exibe anúncios do Google e links para redes sociais e outros sites. O Canal
        Transforma não responde pelo conteúdo de sites de terceiros. O uso de cookies está descrito
        na <Link to="/privacidade">política de privacidade</Link>.
      </p>
      <h2>Mudanças nestes termos</h2>
      <p>
        Estes termos podem ser atualizados. A versão em vigor é sempre a publicada nesta página.
      </p>
    </InfoPage>
  );
}
