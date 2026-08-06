import logo from "@/assets/logo.png.asset.json";

export function SiteFooter() {
  return (
    <footer>
      <div>
        <img src={logo.url} alt="Canal Transforma" />
        <p>Jornalismo local com clareza e responsabilidade.</p>
      </div>
      <div>
        <b>Fale com a gente</b>
        <a href="mailto:canaltransformaa@gmail.com">canaltransformaa@gmail.com</a>
      </div>
      <div className="social">
        <b>Redes sociais</b>
        <a href="https://www.tiktok.com/@canaltransforma">TikTok</a>
        <a href="https://www.instagram.com/canaltransformaa/">Instagram</a>
        <a href="https://www.facebook.com/profile.php?id=61593190852593">Facebook</a>
      </div>
      <small>© 2026 Canal Transforma</small>
    </footer>
  );
}
