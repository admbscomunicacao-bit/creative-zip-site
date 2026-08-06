import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Search, X, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png.asset.json";
import { sections } from "@/data/stories";

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
    <>
      <header>
        <Link to="/" className="logo" aria-label="Canal Transforma — página inicial">
          <img src={logo.url} alt="Canal Transforma" />
        </Link>
        <div className="header-actions">
          <form className="search" onSubmit={submit} role="search">
            <Search size={17} aria-hidden="true" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Pesquisar"
              aria-label="Pesquisar notícias"
            />
          </form>
          <button className="menu-button" aria-label="Abrir menu" onClick={() => setOpen(true)}>
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="topline">
        Catanduva, SP <span>•</span> Jornalismo local verificado
      </div>

      {open && (
        <div className="drawer-wrap">
          <button className="backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <aside className="drawer">
            <div>
              <b>Menu</b>
              <button onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            {sections.map((s) => (
              <Link
                key={s.slug}
                to="/editoria/$section"
                params={{ section: s.slug }}
                className={`nav-link ${s.color}`}
                onClick={() => setOpen(false)}
              >
                {s.name}
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            ))}
            <Link to="/editorial" className="editorial-link" onClick={() => setOpen(false)}>
              Entrar na área editorial <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
