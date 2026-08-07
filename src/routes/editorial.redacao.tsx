import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowRight,
  Link2,
  Loader2,
  Trash2,
} from "lucide-react";
import { editorialSignOut, useRequireEditorialAccount } from "@/components/editorial-shell";
import logo from "@/assets/logo.png.asset.json";
import { sections, type Section } from "@/data/stories";
import {
  deleteArticle,
  listEditorialArticles,
  listNewsroomReporters,
  saveArticle,
  type Article,
  type ArticleInput,
} from "@/lib/articles.functions";
import { pickFiles, uploadArticleMedia } from "@/lib/article-media";

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
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Montserrat:wght@600;700&family=Caveat:wght@400;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;600&family=Roboto+Slab:wght@400;700&family=Source+Code+Pro:wght@400;600&display=swap",
      },
    ],
  }),
  component: Newsroom,
});

type Tab = "reports" | "drafts" | "reporters";

const FONTS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Caveat", value: "Caveat, cursive" },
  { label: "Lora", value: "Lora, serif" },
  { label: "Merriweather", value: "Merriweather, serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Oswald", value: "Oswald, sans-serif" },
  { label: "Roboto Slab", value: "'Roboto Slab', serif" },
  { label: "Source Code Pro", value: "'Source Code Pro', monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
];

const SIZES = ["14", "16", "18", "20", "24", "28", "34", "44"];

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })
    : "Sem data";

function Newsroom() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: account, isLoading } = useRequireEditorialAccount({ requireEditorialAccess: true });

  const fetchArticles = useServerFn(listEditorialArticles);
  const fetchReporters = useServerFn(listNewsroomReporters);
  const persistArticle = useServerFn(saveArticle);
  const removeArticle = useServerFn(deleteArticle);

  const articlesQuery = useQuery({
    queryKey: ["editorial-articles"],
    queryFn: () => fetchArticles(),
    enabled: Boolean(account && account.status === "approved"),
  });
  const reportersQuery = useQuery({
    queryKey: ["editorial-reporters"],
    queryFn: () => fetchReporters(),
    enabled: Boolean(account && account.status === "approved"),
  });

  const [tab, setTab] = useState<Tab>("reports");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const articles = articlesQuery.data ?? [];
  const published = useMemo(() => articles.filter((a) => a.status === "published"), [articles]);
  const drafts = useMemo(() => articles.filter((a) => a.status === "draft"), [articles]);
  const shown = useMemo(() => {
    const base = tab === "reports" ? published : tab === "drafts" ? drafts : [];
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((a) => `${a.title} ${a.summary}`.toLowerCase().includes(q));
  }, [tab, query, published, drafts]);

  const saveMutation = useMutation({
    mutationFn: (input: { data: ArticleInput }) => persistArticle(input),
    onSuccess: (saved: Article) => {
      void queryClient.invalidateQueries({ queryKey: ["editorial-articles"] });
      setEditing(saved);
      setMessage(
        saved.status === "published" ? "Reportagem publicada com sucesso." : "Rascunho salvo.",
      );
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeArticle({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["editorial-articles"] });
      setEditing(null);
      setMessage("Reportagem excluída.");
    },
    onError: (error: Error) => setMessage(error.message),
  });

  if (isLoading || !account) {
    return (
      <main className="admin-page admin-loading">
        <p>Verificando suas permissões...</p>
      </main>
    );
  }

  if (editing) {
    return (
      <ArticleEditor
        key={editing.id ?? "new"}
        article={editing}
        authorName={account.fullName || "Canal Transforma"}
        saving={saveMutation.isPending}
        deleting={deleteMutation.isPending}
        message={message}
        onClose={() => {
          setEditing(null);
          setMessage(null);
        }}
        onSave={(input) => saveMutation.mutate({ data: input })}
        onDelete={(id) => {
          if (confirm("Excluir esta reportagem definitivamente?")) deleteMutation.mutate(id);
        }}
      />
    );
  }

  return (
    <main className="admin-page">
      <aside className="admin-side">
        <img src={logo.url} alt="Canal Transforma" />
        <button
          type="button"
          className="new-report"
          onClick={() => {
            setMessage(null);
            setEditing({
              title: "",
              summary: "",
              section: "Cidade",
              status: "draft",
              bodyHtml: "",
              coverUrl: null,
            });
          }}
        >
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
            Repórteres <span>{reportersQuery.data?.length ?? 0}</span>
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

        {message ? <p className="admin-flash">{message}</p> : null}

        {tab === "reporters" ? (
          reportersQuery.isLoading ? (
            <p>Carregando repórteres...</p>
          ) : (
            <div className="reporter-list">
              {(reportersQuery.data ?? []).map((reporter) => (
                <button
                  type="button"
                  key={reporter.id}
                  onClick={() => {
                    if (account.isAdmin)
                      void navigate({ to: "/editorial/usuarios", search: { u: reporter.id } });
                  }}
                >
                  <b>{reporter.fullName}</b>
                  <span>
                    {reporter.isAdmin ? "Administrador" : "Repórter"} ·{" "}
                    {reporter.status === "approved"
                      ? "aprovado"
                      : reporter.status === "pending"
                        ? "aguardando aprovação"
                        : "bloqueado"}{" "}
                    · {reporter.articles} reportagem(ns)
                  </span>
                  <ArrowRight size={20} />
                </button>
              ))}
              {account.isAdmin ? (
                <button type="button" onClick={() => void navigate({ to: "/editorial/usuarios" })}>
                  <b>Administrar cadastros</b>
                  <span>Aprovar, bloquear e definir permissões</span>
                  <ArrowRight size={20} />
                </button>
              ) : null}
            </div>
          )
        ) : articlesQuery.isLoading ? (
          <p>Carregando reportagens...</p>
        ) : articlesQuery.error ? (
          <p>Não foi possível carregar a biblioteca: {(articlesQuery.error as Error).message}</p>
        ) : (
          <div className="report-list">
            {shown.map((article) => (
              <button
                type="button"
                key={article.id}
                className={`report-row ${article.color}`}
                onClick={() => {
                  setMessage(null);
                  setEditing(article);
                }}
              >
                <span>
                  {article.section} · {article.status === "published" ? "publicada" : "rascunho"}
                </span>
                <div>
                  <b>{article.title || "Sem título"}</b>
                  <p>{article.summary || "Sem resumo"}</p>
                </div>
                <time>{formatDate(article.publishedAt ?? article.updatedAt)}</time>
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

function ArticleEditor({
  article,
  authorName,
  saving,
  deleting,
  message,
  onClose,
  onSave,
  onDelete,
}: {
  article: Partial<Article>;
  authorName: string;
  saving: boolean;
  deleting: boolean;
  message: string | null;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    title: string;
    summary: string;
    section: Section;
    status: "draft" | "published";
    bodyHtml: string;
    coverUrl: string | null;
    authorName: string;
  }) => void;
  onDelete: (id: string) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(article.title ?? "");
  const [summary, setSummary] = useState(article.summary ?? "");
  const [section, setSection] = useState<Section>((article.section as Section) ?? "Cidade");
  const [status, setStatus] = useState<"draft" | "published">(
    (article.status as "draft" | "published") ?? "draft",
  );
  const [coverUrl, setCoverUrl] = useState<string | null>(article.coverUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const savedRange = useRef<Range | null>(null);
  const [inColumn, setInColumn] = useState(false);

  useEffect(() => {
    const onSelect = () => {
      const selection = window.getSelection();
      const node = selection?.anchorNode ?? null;
      const el = node instanceof Element ? node : node?.parentElement ?? null;
      const cell = el?.closest(".article-columns > div") ?? null;
      setInColumn(Boolean(cell && bodyRef.current?.contains(cell)));
      if (selection?.rangeCount && bodyRef.current?.contains(selection.anchorNode)) {
        savedRange.current = selection.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, []);


  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = article.bodyHtml ?? "";
  }, [article.bodyHtml]);

  const exec = (command: string, value?: string) => {
    bodyRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
  };

  const insertHtml = (html: string) => {
    const body = bodyRef.current;
    if (!body) return;
    body.focus();
    const selection = window.getSelection();
    let range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    if ((!range || !body.contains(range.commonAncestorContainer)) && savedRange.current) {
      range = savedRange.current.cloneRange();
    }
    if (!range || !body.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(body);
      range.collapse(false);
    }
    range.deleteContents();
    const template = document.createElement("template");
    template.innerHTML = html;
    const fragment = template.content;
    const last = fragment.lastChild;
    range.insertNode(fragment);
    if (last) {
      const after = document.createRange();
      after.setStartAfter(last);
      after.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(after);
      savedRange.current = after.cloneRange();
    }
  };

  const insertColumns = (count: 1 | 2 | 3) => {
    const cells = Array.from(
      { length: count },
      () => `<div class="article-column"><p data-ph="Escreva aqui ou insira uma foto/vídeo…"><br></p></div>`,
    ).join("");

    insertHtml(
      `<p class="article-paragraph" data-ph="Escreva antes das colunas…"><br></p>` +
        `<div class="article-columns cols-${count}" data-columns="${count}">${cells}</div>` +
        `<p class="article-paragraph" data-ph="Continue escrevendo depois das colunas…"><br></p>`,
    );
  };


  const withUpload = async (multiple: boolean, render: (url: string, kind: string) => string) => {
    setLocalError(null);
    const files = await pickFiles(multiple);
    if (!files.length) return;
    setUploading(true);
    try {
      let html = "";
      for (const file of files) {
        const { url, kind } = await uploadArticleMedia(file);
        html += render(url, kind);
      }
      insertHtml(html);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Falha ao enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const submit = (nextStatus?: "draft" | "published") => {
    const finalStatus = nextStatus ?? status;
    if (!title.trim()) {
      setLocalError("Informe o título da reportagem.");
      return;
    }
    setLocalError(null);
    setStatus(finalStatus);
    onSave({
      ...(article.id ? { id: article.id } : {}),
      title: title.trim(),
      summary: summary.trim(),
      section,
      status: finalStatus,
      bodyHtml: bodyRef.current?.innerHTML ?? "",
      coverUrl,
      authorName: article.authorName || authorName,
    });
  };

  return (
    <main className="admin-page">
      <aside className="admin-side">
        <img src={logo.url} alt="Canal Transforma" />
        <button type="button" onClick={onClose}>
          ← Voltar à biblioteca
        </button>
        <p className="eyebrow">Informações da matéria</p>
        <label>
          Editoria
          <select value={section} onChange={(e) => setSection(e.target.value as Section)}>
            {sections.map((s) => (
              <option key={s.slug} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicada</option>
          </select>
        </label>
        <label>
          Repórter responsável
          <input readOnly value={article.authorName || authorName} />
        </label>
        <label>
          Imagem de capa
          <button
            type="button"
            className="cover-button"
            onClick={async () => {
              setLocalError(null);
              const files = await pickFiles(false);
              if (!files.length) return;
              setUploading(true);
              try {
                const first = files[0];
                if (!first) return;
                const { url } = await uploadArticleMedia(first);
                setCoverUrl(url);
              } catch (error) {
                setLocalError(error instanceof Error ? error.message : "Falha ao enviar a capa.");
              } finally {
                setUploading(false);
              }
            }}
          >
            {coverUrl ? "Trocar capa" : "Enviar capa"}
          </button>
        </label>
        {coverUrl ? (
          <div className="cover-preview">
            <img src={coverUrl} alt="Capa da reportagem" />
            <button type="button" onClick={() => setCoverUrl(null)}>
              Remover capa
            </button>
          </div>
        ) : null}
        {article.id ? (
          <button type="button" className="danger" onClick={() => onDelete(article.id!)}>
            <Trash2 size={15} /> {deleting ? "Excluindo..." : "Excluir reportagem"}
          </button>
        ) : null}
      </aside>
      <section className="editor-workspace">
        <div className="editor-head">
          <p className="eyebrow">Editor de reportagem</p>
          <div className="editor-head-actions">
            <button type="button" className="ghost" onClick={() => submit("draft")}>
              Salvar rascunho
            </button>
            <button type="button" className="save" onClick={() => submit()} disabled={saving}>
              {saving ? <Loader2 size={16} className="spin" /> : null}
              {status === "published" ? "Salvar e publicar" : "Salvar alterações"}
            </button>
          </div>
        </div>

        {localError ? <p className="admin-flash error">{localError}</p> : null}
        {message ? <p className="admin-flash">{message}</p> : null}
        {uploading ? <p className="admin-flash">Enviando arquivo...</p> : null}

        <label className="field">
          Título
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da reportagem"
          />
        </label>
        <label className="field">
          Resumo
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Resumo para os cards e a abertura da matéria"
          />
        </label>

        <div className="format">
          <b>Texto</b>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) exec("fontName", e.target.value);
              e.target.selectedIndex = 0;
            }}
            aria-label="Fonte"
          >
            <option value="">Fonte</option>
            {FONTS.map((font) => (
              <option key={font.label} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value)
                exec("fontSize", String(SIZES.indexOf(e.target.value) + 1 || 3));
              e.target.selectedIndex = 0;
            }}
            aria-label="Tamanho"
          >
            <option value="">Tamanho</option>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) exec("formatBlock", e.target.value);
              e.target.selectedIndex = 0;
            }}
            aria-label="Estilo do parágrafo"
          >
            <option value="">Estilo</option>
            <option value="p">Parágrafo</option>
            <option value="h2">Título</option>
            <option value="h3">Subtítulo</option>
            <option value="blockquote">Citação</option>
          </select>
          <button type="button" title="Negrito" onClick={() => exec("bold")}>
            <b>B</b>
          </button>
          <button type="button" title="Itálico" onClick={() => exec("italic")}>
            <i>I</i>
          </button>
          <button type="button" title="Sublinhado" onClick={() => exec("underline")}>
            <u>U</u>
          </button>
          <button
            type="button"
            title="Inserir link"
            onClick={() => {
              const selection = window.getSelection();
              savedRange.current =
                selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
              setLinkText(selection ? selection.toString() : "");
              setLinkUrl("");
              setLinkOpen(true);
            }}
          >
            <Link2 size={16} />
          </button>
          <button type="button" title="Alinhar à esquerda" onClick={() => exec("justifyLeft")}>
            <AlignLeft size={16} />
          </button>
          <button type="button" title="Centralizar" onClick={() => exec("justifyCenter")}>
            <AlignCenter size={16} />
          </button>
          <button type="button" title="Alinhar à direita" onClick={() => exec("justifyRight")}>
            <AlignRight size={16} />
          </button>
          <button type="button" title="Justificar" onClick={() => exec("justifyFull")}>
            <AlignJustify size={16} />
          </button>
        </div>

        {linkOpen ? (
          <div className="link-dialog-backdrop" role="dialog" aria-modal="true">
            <div className="link-dialog">
              <h3>Inserir link</h3>
              <label>
                Texto do link
                <input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Palavra ou frase"
                />
              </label>
              <label>
                Endereço (URL)
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <div className="link-dialog-actions">
                <button type="button" className="ghost" onClick={() => setLinkOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="save"
                  onClick={() => {
                    const url = linkUrl.trim();
                    if (!url) return;
                    const href = /^(https?:|mailto:|tel:|\/)/i.test(url) ? url : `https://${url}`;
                    const label = linkText.trim();
                    if (savedRange.current) {
                      const selection = window.getSelection();
                      selection?.removeAllRanges();
                      selection?.addRange(savedRange.current);
                    }
                    const selected = window.getSelection()?.toString() ?? "";
                    if (selected && (!label || label === selected)) {
                      exec("createLink", href);
                    } else {
                      insertHtml(
                        `<a href="${href}" target="_blank" rel="noopener noreferrer">${label || href}</a>`,
                      );
                    }
                    setLinkOpen(false);
                  }}
                >
                  Inserir link
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div
          ref={bodyRef}
          className="rich-placeholder"
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Comece a escrever a reportagem. Adicione texto, fotos, vídeos e blocos conforme necessário."
          onInput={() => {
            const body = bodyRef.current;
            if (!body) return;
            const last = body.lastElementChild;
            if (last?.classList.contains("article-columns")) {
              const paragraph = document.createElement("p");
              paragraph.className = "article-paragraph";
              paragraph.dataset["ph"] = "Continue escrevendo aqui…";
              paragraph.appendChild(document.createElement("br"));
              body.appendChild(paragraph);
            }
          }}
        />

        <div className="block-actions">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => insertColumns(n as 1 | 2 | 3)}
            >
              + {n} coluna{n > 1 ? "s" : ""}
            </button>
          ))}
        </div>

        <div className="block-actions block-actions-insert">
          <span>{inColumn ? "Inserir na coluna selecionada:" : "Inserir no cursor:"}</span>
          <button
            type="button"
            onClick={() => insertHtml(`<p data-ph="Escreva aqui…"><br></p>`)}
          >
            + Texto
          </button>
          <button
            type="button"
            onClick={() =>
              void withUpload(false, (url, kind) =>
                kind === "video"
                  ? `<figure><video controls src="${url}"></video></figure>`
                  : `<figure><img src="${url}" alt="" /><figcaption data-ph="Legenda da imagem"><br></figcaption></figure>`,
              )
            }
          >
            + Foto ou vídeo
          </button>
          <button
            type="button"
            onClick={() =>
              void withUpload(
                true,
                (url) => `<div class="article-gallery-item"><img src="${url}" alt="" /></div>`,
              )
            }
          >
            + Galeria
          </button>
        </div>

      </section>
    </main>
  );
}

