import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/logo.png.asset.json";
import { sections } from "@/data/stories";

const navClass: Record<string, string> = {
  cidade: "nav-cidade",
  politica: "nav-politica",
  servicos: "nav-servicos",
  esportes: "nav-esportes",
};

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/busca", search: { q: term } });
    setOpen(false);
  };

  return (
    <div className="site-chrome">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Canal Transforma, página inicial">
          <img src={logo.url} alt="Canal Transforma" />
        </Link>
        <div className="header-actions">
          <form className="header-search" role="search" onSubmit={submit}>
            <label className="sr-only" htmlFor="site-search">
              Pesquisar notícias
            </label>
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              id="site-search"
              type="search"
              placeholder="Pesquisar"
              autoComplete="off"
              name="q"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </form>
          <button
            type="button"
            className="menu-toggle"
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(true)}
          >
            <i />
            <i />
            <i />
          </button>
        </div>
      </header>
      <div className="topline">
        Catanduva, SP <span>•</span> Jornalismo local verificado
      </div>
      <div className={`menu-overlay${open ? " is-open" : ""}`} aria-hidden={!open}>
        <button
          type="button"
          className="menu-backdrop"
          aria-label="Fechar menu"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
        <aside className="menu-panel" id="site-menu" aria-label="Menu principal">
          <div className="menu-panel-head">
            <span>Menu</span>
            <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <nav aria-label="Editorias">
            {sections.map((s) => (
              <Link
                key={s.slug}
                to="/editoria/$section"
                params={{ section: s.slug }}
                className={`menu-link ${navClass[s.slug]}`}
                onClick={() => setOpen(false)}
              >
                {s.name}
                <b>→</b>
              </Link>
            ))}
          </nav>
          <Link to="/editorial" className="menu-editorial" onClick={() => setOpen(false)}>
            Entrar na área editorial <b>→</b>
          </Link>
        </aside>
      </div>
    </div>
  );
}
