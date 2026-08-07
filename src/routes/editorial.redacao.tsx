import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { editorialSignOut, useRequireEditorialAccount } from "@/components/editorial-shell";
import logo from "@/assets/logo.png.asset.json";
import { sections, stories, type Section, type Story } from "@/data/stories";

export const Route = createFileRoute("/editorial/redacao")({
  head: () => ({
    meta: [
      { title: "Painel da redação — Canal Transforma" },
      {
        name: "description",
        content:
          "Painel editorial do Canal Transforma: biblioteca de reportagens, rascunhos, repórteres e editor de matéria.",
      },
      { property: "og:title", content: "Painel da redação — Canal Transforma" },
      {
        property: "og:description",
        content: "Área interna da equipe editorial do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Newsroom,
});

type Tab = "reports" | "drafts" | "reporters";
type Draft = { title: string; summary: string; section: Section; status: string; reporter: string };

function Newsroom() {
  const navigate = useNavigate();
  const { data: account, isLoading } = useRequireEditorialAccount({ requireEditorialAccess: true });
  const [tab, setTab] = useState<Tab>("reports");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Story | null>(null);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    summary: "",
    section: "Cidade",
    status: "Rascunho",
    reporter: "Canal Transforma",
  });

  const published = useMemo(() => stories.filter((s) => s.featured), []);
  const drafts = useMemo(() => stories.filter((s) => !s.featured), []);
  const shown = useMemo(() => {
    const base = tab === "reports" ? published : tab === "drafts" ? drafts : [];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((s) => `${s.title} ${s.summary}`.toLowerCase().includes(q));
  }, [tab, query, published, drafts]);

  if (isLoading || !account) {
    return (
      <main className="admin-page admin-loading">
        <p>Verificando suas permissões...</p>
      </main>
    );
  }

  const openStory = (story: Story) => {
    setEditing(story);
    setDraft({
      title: story.title,
      summary: story.summary,
      section: story.section,
      status: story.featured ? "Publicada" : "Rascunho",
      reporter: account.fullName || "Canal Transforma",
    });
  };

  const createStory = () => {
    setEditing({
      slug: "nova-reportagem",
      section: "Cidade",
      title: "",
      summary: "",
      date: "Rascunho",
      color: "blue",
      image: "",
    });
    setDraft({
      title: "",
      summary: "",
      section: "Cidade",
      status: "Rascunho",
      reporter: account.fullName || "Canal Transforma",
    });
  };

  if (editing) {
    return (
      <main className="admin-page">
        <aside className="admin-side">
          <img src={logo.url} alt="Canal Transforma" />
          <button type="button" onClick={() => setEditing(null)}>
            ← Voltar à biblioteca
          </button>
          <p className="eyebrow">Informações da matéria</p>
          <label>
            Editoria
            <select
              value={draft.section}
              onChange={(e) => setDraft({ ...draft, section: e.target.value as Section })}
            >
              {sections.map((s) => (
                <option key={s.slug}>{s.name}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              <option>Rascunho</option>
              <option>Publicada</option>
            </select>
          </label>
          <label>
            Repórter responsável
            <select
              value={draft.reporter}
              onChange={(e) => setDraft({ ...draft, reporter: e.target.value })}
            >
              <option>{account.fullName || "Canal Transforma"}</option>
              <option>Canal Transforma</option>
            </select>
          </label>
        </aside>
        <section className="editor-workspace">
          <div className="editor-head">
            <p className="eyebrow">Editor de reportagem</p>
            <button type="button" className="save" onClick={() => setEditing(null)}>
              Salvar alterações
            </button>
          </div>
          <label className="field">
            Título
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Título da reportagem"
            />
          </label>
          <label className="field">
            Resumo
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              placeholder="Resumo para os cards e a abertura da matéria"
            />
          </label>
          <div className="format">
            <b>Texto</b>
            <select>
              <option>Inter</option>
              <option>Montserrat</option>
              <option>Caveat</option>
            </select>
            <select>
              <option>16</option>
              <option>18</option>
              <option>20</option>
            </select>
            <button type="button">
              <b>B</b>
            </button>
            <button type="button">
              <i>I</i>
            </button>
            <button type="button">
              <u>U</u>
            </button>
            <button type="button">↗</button>
            <button type="button">≡</button>
          </div>
          <div
            className="rich-placeholder"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Comece a escrever a reportagem. Adicione texto, fotos, vídeos e blocos conforme necessário."
          />
          <div className="block-actions">
            <button type="button">+ Bloco de texto</button>
            <button type="button">+ Foto ou vídeo</button>
            <button type="button">+ Galeria</button>
            <button type="button">+ Layout em colunas</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <aside className="admin-side">
        <img src={logo.url} alt="Canal Transforma" />
        <button type="button" className="new-report" onClick={createStory}>
          + Nova reportagem
        </button>
        <nav>
          <button
            type="button"
            className={tab === "reports" ? "active" : ""}
            onClick={() => setTab("reports")}
          >
            Reportagens <span>{published.length}</span>
          </button>
          <button
            type="button"
            className={tab === "drafts" ? "active" : ""}
            onClick={() => setTab("drafts")}
          >
            Rascunhos <span>{drafts.length}</span>
          </button>
          <button
            type="button"
            className={tab === "reporters" ? "active" : ""}
            onClick={() => setTab("reporters")}
          >
            Repórteres <span>{account.isAdmin ? 2 : 1}</span>
          </button>
        </nav>
        <div className="admin-side-links">
          <Link to="/editorial/perfil">Meu perfil</Link>
          <Link to="/editorial/seguranca">Segurança da conta</Link>
          {account.isAdmin ? <Link to="/editorial/usuarios">Administrar usuários</Link> : null}
          <Link to="/">Ver portal público ↗</Link>
          <button
            type="button"
            onClick={async () => {
              await editorialSignOut();
              await navigate({ to: "/editorial" });
            }}
          >
            Sair
          </button>
        </div>
      </aside>
      <section className="admin-library">
        <div className="admin-library-head">
          <div>
            <p className="eyebrow">Biblioteca editorial</p>
            <h1>
              {tab === "reports"
                ? "Reportagens publicadas"
                : tab === "drafts"
                  ? "Rascunhos"
                  : "Repórteres"}
            </h1>
          </div>
          {tab !== "reporters" ? (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar reportagem"
              aria-label="Buscar reportagem"
            />
          ) : null}
        </div>
        {tab === "reporters" ? (
          <div className="reporter-list">
            <button type="button">
              <b>{account.fullName || "Canal Transforma"}</b>
              <span>{account.isAdmin ? "Administrador" : "Repórter"}</span>
              <ArrowRight size={20} />
            </button>
            {account.isAdmin ? (
              <button type="button" onClick={() => void navigate({ to: "/editorial/usuarios" })}>
                <b>Novo repórter</b>
                <span>Aprovar e administrar cadastros editoriais</span>
                <ArrowRight size={20} />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="report-list">
            {shown.map((story) => (
              <button
                type="button"
                key={story.slug}
                className={`report-row ${story.color}`}
                onClick={() => openStory(story)}
              >
                <span>
                  {story.section} · {tab === "reports" ? "publicada" : "rascunho"}
                </span>
                <div>
                  <b>{story.title}</b>
                  <p>{story.summary}</p>
                </div>
                <time>{story.date}</time>
                <ArrowRight size={20} />
              </button>
            ))}
            {!shown.length ? <p>Nenhuma reportagem encontrada.</p> : null}
          </div>
        )}
      </section>
    </main>
  );
}
