import { brand } from "@/lib/brand";

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
          <a href="mailto:canaltransformaa@gmail.com">canaltransformaa@gmail.com</a>
        </div>
        <div className="footer-social" aria-label="Redes sociais">
          <a href="https://www.tiktok.com/@canaltransforma" target="_blank" rel="noreferrer">
            TikTok
          </a>
          <a href="https://www.instagram.com/canaltransformaa/" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61593190852593"
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
        </div>
        <span className="footer-copyright">© 2026 Canal Transforma</span>
      </div>
    </footer>
  );
}
