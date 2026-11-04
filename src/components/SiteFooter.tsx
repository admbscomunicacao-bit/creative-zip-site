import { Link } from "@tanstack/react-router";
import { brand } from "@/lib/brand";
import { socialLinks, SocialIcon } from "@/components/social";

export function SiteFooter() {
  return (
    <footer className="site-footer-wrap">
      <div className="site-footer">
        <div className="footer-brand">
          <img src={brand.logoOnBlue} alt="Canal Transforma" width={720} height={186} />
          <p>A notícia que aproxima Catanduva da verdade.</p>
          <span className="footer-signature">Feito em Catanduva, para Catanduva.</span>
        </div>
        <div className="footer-contact">
          <strong>Fale com a gente</strong>
          <a href="mailto:contato@canaltransforma.com.br">contato@canaltransforma.com.br</a>
        </div>
        <div className="footer-social" aria-label="Redes sociais">
          {socialLinks.map((s) => (
            <a key={s.name} href={s.href} target="_blank" rel="noreferrer">
              <SocialIcon path={s.path} size={16} />
              {s.name}
            </a>
          ))}
        </div>
        <span className="footer-copyright">
          © 2026 Canal Transforma · <Link to="/quem-somos">Quem somos</Link> ·{" "}
          <Link to="/expediente">Expediente</Link> ·{" "}
          <Link to="/politica-editorial">Política editorial</Link> ·{" "}
          <Link to="/fale-conosco">Envie sua pauta</Link> · <Link to="/videos">Vídeos e lives</Link>{" "}
          · <Link to="/programacao">Programação</Link> · <Link to="/privacidade">Privacidade</Link>{" "}
          · <Link to="/termos">Termos de uso</Link>{" "}
          · <Link to="/editorial">Área da redação</Link>
        </span>
      </div>
    </footer>
  );
}
