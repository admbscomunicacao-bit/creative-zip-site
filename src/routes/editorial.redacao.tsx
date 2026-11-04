import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  ArrowRight,
  Eye,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { editorialSignOut, useRequireEditorialAccount } from "@/components/editorial-shell";
import { brand } from "@/lib/brand";
import { sections, type Section } from "@/data/stories";
import {
  deleteArticle,
  isScheduled,
  listEditorialArticles,
  listNewsroomReporters,
  saveArticle,
  type Article,
  type ArticleInput,
  type ArticleStatus,
} from "@/lib/articles.functions";
import { roleLabel, type EditorialAccount } from "@/lib/editorial.functions";
import { pickFiles, uploadArticleMedia } from "@/lib/article-media";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { sanitizeArticleHtml } from "@/lib/article-html";
import { CentralPanel } from "@/components/CentralPanel";
import { ArticleView } from "@/components/ArticleView";
import { youtubeThumb, youtubeVideoId } from "@/lib/youtube";

export const Route = createFileRoute("/editorial/redacao")({
  head: () => ({
    meta: [
      { title: "Painel da redação | Canal Transforma" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Área interna da equipe editorial do Canal Transforma.",
      },
    ],
  }),
  component: Newsroom,
});

type Tab = "published" | "review" | "drafts" | "reporters" | "central";

const TITLE_IDEAL = 70;
const SUMMARY_IDEAL = 160;

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      })
    : "Sem data";

/** Pode editar: editor/admin sempre; repórter só a própria matéria ainda não publicada. */
const canEdit = (account: EditorialAccount, article: Partial<Article>) =>
  account.isEditor ||
  !article.id ||
  (article.authorId === account.userId && article.status !== "published");

/** Pode excluir: admin sempre; repórter/editor só a própria ainda não publicada. */
const canDelete = (account: EditorialAccount, article: Partial<Article>) =>
  Boolean(article.id) &&
  (account.isAdmin || (article.authorId === account.userId && article.status !== "published"));

const statusLabel = (a: Pick<Article, "status" | "publishedAt">) =>
  isScheduled(a)
    ? `agendada para ${formatDate(a.publishedAt)}`
    : a.status === "published"
      ? "publicada"
      : a.status === "review"
        ? "em revisão"
        : "rascunho";

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
    enabled: Boolean(account && account.status === "approved" && account.isEditor),
  });

  const [tab, setTab] = useState<Tab>("published");
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Article | null>(null);

  const articles = articlesQuery.data ?? [];
  const byStatus = useMemo(
    () => ({
      published: articles.filter((a) => a.status === "published"),
      review: articles.filter((a) => a.status === "review"),
      drafts: articles.filter((a) => a.status === "draft"),
    }),
    [articles],
  );
  const shown = useMemo(() => {
    const base =
      tab === "published"
        ? byStatus.published
        : tab === "review"
          ? byStatus.review
          : tab === "drafts"
            ? byStatus.drafts
            : [];
    const q = query.trim().toLowerCase();
    return base.filter(
      (a) =>
        (!q || `${a.title} ${a.summary} ${a.authorName}`.toLowerCase().includes(q)) &&
        (!sectionFilter || a.section === sectionFilter) &&
        (!mineOnly || a.authorId === account?.userId),
    );
  }, [tab, query, sectionFilter, mineOnly, byStatus, account?.userId]);

  const saveMutation = useMutation({
    mutationFn: (input: { data: ArticleInput }) => persistArticle(input),
    onSuccess: (saved: Article) => {
      void queryClient.invalidateQueries({ queryKey: ["editorial-articles"] });
      setEditing(saved);
      setMessage(
        isScheduled(saved)
          ? `Matéria agendada para ${formatDate(saved.publishedAt)}.`
          : saved.status === "published"
            ? "Matéria publicada."
            : saved.status === "review"
              ? "Matéria enviada para revisão. Um editor vai revisar e publicar."
              : saved.reviewNote && saved.authorId !== account?.userId
                ? "Matéria devolvida ao repórter com a sua observação."
                : "Rascunho salvo.",
      );
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeArticle({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["editorial-articles"] });
      setEditing(null);
      setConfirming(null);
      setMessage("Matéria excluída.");
    },
    onError: (error: Error) => {
      setConfirming(null);
      setMessage(error.message);
    },
  });

  if (isLoading || !account) {
    return (
      <main className="admin-page admin-loading">
        <p>Verificando suas permissões...</p>
      </main>
    );
  }

  const confirmDialog = confirming ? (
    <ConfirmDialog
      title="Excluir matéria?"
      text={`“${confirming.title || "Sem título"}” será apagada definitivamente.`}
      confirmLabel={deleteMutation.isPending ? "Excluindo..." : "Excluir"}
      onCancel={() => setConfirming(null)}
      onConfirm={() => deleteMutation.mutate(confirming.id)}
    />
  ) : null;

  if (editing) {
    return (
      <>
        <ArticleEditor
          key={editing.id ?? "new"}
          article={editing}
          account={account}
          saving={saveMutation.isPending}
          message={message}
          onClose={() => {
            setEditing(null);
            setMessage(null);
          }}
          onSave={(input) => saveMutation.mutate({ data: input })}
          onDelete={() => setConfirming(editing as Article)}
        />
        {confirmDialog}
      </>
    );
  }

  const tabs: { id: Tab; label: string; count?: number | undefined; show: boolean }[] = [
    { id: "published", label: "Publicadas", count: byStatus.published.length, show: true },
    {
      id: "review",
      label: account.isEditor ? "Para revisar" : "Em revisão",
      count: byStatus.review.length,
      show: true,
    },
    { id: "drafts", label: "Rascunhos", count: byStatus.drafts.length, show: true },
    {
      id: "reporters",
      label: "Equipe",
      count: reportersQuery.data?.length,
      show: account.isEditor,
    },
    { id: "central", label: "Central do canal", show: true },
  ];

  const titles: Record<Tab, string> = {
    published: "Matérias publicadas",
    review: account.isEditor ? "Aguardando sua revisão" : "Enviadas para revisão",
    drafts: account.isEditor ? "Rascunhos da redação" : "Meus rascunhos",
    reporters: "Equipe da redação",
    central: "Central do canal",
  };

  return (
    <main className="admin-page">
      <aside className="admin-side">
        <img src={brand.logoOnCream} alt="Canal Transforma" width={720} height={186} />
        <p className="admin-whoami">
          {account.fullName || account.email}
          <span>
            {roleLabel[account.isAdmin ? "admin" : account.isEditor ? "editor" : "reporter"]}
          </span>
        </p>
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
              videoUrl: null,
              tags: [],
            });
          }}
        >
          + Nova matéria
        </button>
        <nav>
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                className={tab === t.id ? "active" : ""}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.count !== undefined ? (
                  <span
                    className={t.id === "review" && account.isEditor && t.count ? "is-alert" : ""}
                  >
                    {t.count}
                  </span>
                ) : null}
              </button>
            ))}
        </nav>
        <div className="admin-side-links">
          <Link to="/editorial/perfil">Meu perfil</Link>
          <Link to="/editorial/seguranca">Segurança da conta</Link>
          {account.isAdmin ? (
            <Link to="/editorial/usuarios" search={{ u: undefined }}>
              Administrar usuários
            </Link>
          ) : null}
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
            <p className="eyebrow">Redação</p>
            <h1>{titles[tab]}</h1>
          </div>
          {tab === "published" || tab === "review" || tab === "drafts" ? (
            <div className="admin-filters">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título ou autor"
                aria-label="Buscar matéria"
              />
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                aria-label="Filtrar por editoria"
              >
                <option value="">Todas as editorias</option>
                {sections.map((s) => (
                  <option key={s.slug} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={(e) => setMineOnly(e.target.checked)}
                />
                Só as minhas
              </label>
            </div>
          ) : null}
        </div>

        {message ? <p className="admin-flash">{message}</p> : null}

        {tab === "central" ? (
          <CentralPanel isAdmin={account.isAdmin} />
        ) : tab === "reporters" ? (
          reportersQuery.isLoading ? (
            <p>Carregando equipe...</p>
          ) : (
            <div className="reporter-list">
              {(reportersQuery.data ?? []).map((reporter) => (
                <button
                  type="button"
                  key={reporter.id}
                  disabled={!account.isAdmin}
                  onClick={() => {
                    if (account.isAdmin)
                      void navigate({ to: "/editorial/usuarios", search: { u: reporter.id } });
                  }}
                >
                  <b>{reporter.fullName}</b>
                  <span>
                    {roleLabel[reporter.role]} ·{" "}
                    {reporter.status === "approved"
                      ? "aprovado"
                      : reporter.status === "pending"
                        ? "aguardando aprovação"
                        : "bloqueado"}{" "}
                    · {reporter.articles} matéria(s)
                  </span>
                  {account.isAdmin ? <ArrowRight size={20} /> : null}
                </button>
              ))}
            </div>
          )
        ) : articlesQuery.isLoading ? (
          <p>Carregando matérias...</p>
        ) : articlesQuery.error ? (
          <p>Não foi possível carregar as matérias: {(articlesQuery.error as Error).message}</p>
        ) : (
          <div className="report-list">
            {shown.map((article) => {
              const editable = canEdit(account, article);
              return (
                <button
                  type="button"
                  key={article.id}
                  className={`report-row ${article.color}`}
                  onClick={() => {
                    setMessage(null);
                    setEditing(article);
                  }}
                >
                  {article.coverUrl || article.videoUrl ? (
                    <img
                      className="report-thumb"
                      src={
                        article.coverUrl ??
                        youtubeThumb(youtubeVideoId(article.videoUrl ?? "") ?? "")
                      }
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="report-thumb is-empty" aria-hidden="true" />
                  )}
                  <div>
                    <span className="report-kicker">
                      {article.section} · {statusLabel(article)}
                      {editable ? "" : " · só leitura"}
                    </span>
                    <b>{article.title || "Sem título"}</b>
                    <p>
                      {article.authorName || "Sem autor"}
                      {article.status === "review" && article.submittedAt
                        ? ` · enviada em ${formatDate(article.submittedAt)}`
                        : ""}
                      {article.status === "published" && article.views
                        ? ` · ${article.views.toLocaleString("pt-BR")} leitura${article.views > 1 ? "s" : ""} em 30 dias`
                        : ""}
                      {article.status === "draft" && article.reviewNote
                        ? " · devolvida com observações"
                        : ""}
                    </p>
                  </div>
                  <time>{formatDate(article.publishedAt ?? article.updatedAt)}</time>
                  <ArrowRight size={20} />
                </button>
              );
            })}
            {!shown.length ? (
              <p className="admin-empty">
                {tab === "review"
                  ? account.isEditor
                    ? "Nenhuma matéria esperando revisão."
                    : "Você não tem matérias em revisão."
                  : "Nenhuma matéria encontrada."}
              </p>
            ) : null}
          </div>
        )}
      </section>
      {confirmDialog}
    </main>
  );
}

type EditorInput = Omit<ArticleInput, "status"> & { status: ArticleStatus };

/** Valor para <input type="datetime-local"> no horário de Brasília. */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return parts.replace(" ", "T");
};
/** Brasília não tem horário de verão desde 2019: UTC−3. */
const fromLocalInput = (value: string) =>
  value ? new Date(`${value}:00-03:00`).toISOString() : null;

function ArticleEditor({
  article,
  account,
  saving,
  message,
  onClose,
  onSave,
  onDelete,
}: {
  article: Partial<Article>;
  account: EditorialAccount;
  saving: boolean;
  message: string | null;
  onClose: () => void;
  onSave: (input: EditorInput) => void;
  onDelete: () => void;
}) {
  const readOnly = !canEdit(account, article);
  const isOwn = !article.id || article.authorId === account.userId;
  const status = (article.status ?? "draft") as ArticleStatus;
  const storageKey = `ct-editor-${article.id ?? "nova"}`;

  const bodyRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [title, setTitle] = useState(article.title ?? "");
  const [subtitle, setSubtitle] = useState(article.subtitle ?? "");
  const [summary, setSummary] = useState(article.summary ?? "");
  const [section, setSection] = useState<Section>((article.section as Section) ?? "Cidade");
  const [coverUrl, setCoverUrl] = useState<string | null>(article.coverUrl ?? null);
  const [coverCaption, setCoverCaption] = useState(article.coverCaption ?? "");
  const [coverCredit, setCoverCredit] = useState(article.coverCredit ?? "");
  const [coverAlt, setCoverAlt] = useState(article.coverAlt ?? "");
  const [videoUrl, setVideoUrl] = useState(article.videoUrl ?? "");
  const [tagsText, setTagsText] = useState((article.tags ?? []).join(", "));
  const [publishAt, setPublishAt] = useState(
    isScheduled({ status, publishedAt: article.publishedAt ?? null })
      ? toLocalInput(article.publishedAt)
      : "",
  );
  const [reviewNote, setReviewNote] = useState("");
  const [correctionNote, setCorrectionNote] = useState(article.correctionNote ?? "");
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [inColumn, setInColumn] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [recovered, setRecovered] = useState<{ savedAt: string } | null>(null);
  const videoId = youtubeVideoId(videoUrl.trim());

  const tags = useMemo(
    () =>
      tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
    [tagsText],
  );

  // Texto do corpo entra uma vez; depois o navegador cuida da edição.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = article.bodyHtml ?? "";
  }, [article.bodyHtml]);

  // Cópia local: se a aba fechar ou a conexão cair, o texto volta ao abrir de novo.
  useEffect(() => {
    if (readOnly) return;
    if (article.id) {
      try {
        window.localStorage.removeItem("ct-editor-nova");
      } catch {
        /* nada */
      }
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const copy = JSON.parse(raw) as { savedAt: string; bodyHtml: string; title: string };
      const serverTime = article.updatedAt ? new Date(article.updatedAt).getTime() : 0;
      if (
        new Date(copy.savedAt).getTime() > serverTime &&
        copy.bodyHtml !== (article.bodyHtml ?? "")
      ) {
        setRecovered({ savedAt: copy.savedAt });
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      /* armazenamento indisponível: segue sem cópia local */
    }
  }, [storageKey, readOnly, article.updatedAt, article.bodyHtml]);

  const snapshot = () => ({
    savedAt: new Date().toISOString(),
    title,
    subtitle,
    summary,
    section,
    coverUrl,
    coverCaption,
    coverCredit,
    coverAlt,
    videoUrl,
    tagsText,
    bodyHtml: bodyRef.current?.innerHTML ?? "",
  });

  const markDirty = () => setDirty(true);

  useEffect(() => {
    if (!dirty || readOnly) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(snapshot()));
      } catch {
        /* sem armazenamento local */
      }
    }, 800);
    return () => window.clearTimeout(timer);
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Salvou no servidor (a data de atualização mudou): a cópia local não é mais necessária.
  const lastSaved = useRef(article.updatedAt);
  useEffect(() => {
    if (article.updatedAt && article.updatedAt !== lastSaved.current) {
      lastSaved.current = article.updatedAt;
      setDirty(false);
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        /* nada a limpar */
      }
    }
  }, [article.updatedAt, storageKey]);

  const restoreCopy = () => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const c = JSON.parse(raw) as ReturnType<typeof snapshot>;
      setTitle(c.title);
      setSubtitle(c.subtitle);
      setSummary(c.summary);
      setSection(c.section);
      setCoverUrl(c.coverUrl);
      setCoverCaption(c.coverCaption);
      setCoverCredit(c.coverCredit);
      setCoverAlt(c.coverAlt);
      setVideoUrl(c.videoUrl);
      setTagsText(c.tagsText);
      if (bodyRef.current) bodyRef.current.innerHTML = c.bodyHtml;
      setDirty(true);
    } catch {
      setLocalError("Não foi possível recuperar a cópia local.");
    }
    setRecovered(null);
  };

  useEffect(() => {
    const onSelect = () => {
      const selection = window.getSelection();
      const node = selection?.anchorNode ?? null;
      const el = node instanceof Element ? node : (node?.parentElement ?? null);
      const cell = el?.closest(".article-columns > div") ?? null;
      setInColumn(Boolean(cell && bodyRef.current?.contains(cell)));
      if (selection?.rangeCount && bodyRef.current?.contains(selection.anchorNode)) {
        savedRange.current = selection.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
  }, []);

  const exec = (command: string, value?: string) => {
    bodyRef.current?.focus();
    document.execCommand(command, false, value);
    markDirty();
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
    markDirty();
  };

  const insertColumns = (count: 1 | 2 | 3) => {
    const cells = Array.from(
      { length: count },
      () =>
        `<div class="article-column"><p data-ph="Escreva aqui ou insira uma foto/vídeo…"><br></p></div>`,
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

  const submit = (nextStatus: ArticleStatus, extra: Partial<EditorInput> = {}) => {
    if (!title.trim()) {
      setLocalError("Informe o título da matéria.");
      return;
    }
    if (nextStatus !== "draft" && !summary.trim()) {
      setLocalError("Escreva o resumo: ele aparece nos cards da capa e na prévia do WhatsApp.");
      return;
    }
    if (nextStatus !== "draft" && coverUrl && !coverAlt.trim()) {
      setLocalError(
        "Descreva a foto de capa no campo “Texto alternativo” (acessibilidade e Google).",
      );
      return;
    }
    if (videoUrl.trim() && !videoId) {
      setLocalError("O link do vídeo precisa ser do YouTube (youtube.com ou youtu.be).");
      return;
    }
    setLocalError(null);
    onSave({
      ...(article.id ? { id: article.id } : {}),
      title: title.trim(),
      subtitle: subtitle.trim(),
      summary: summary.trim(),
      section,
      status: nextStatus,
      bodyHtml: bodyRef.current?.innerHTML ?? "",
      coverUrl,
      coverCaption: coverCaption.trim(),
      coverCredit: coverCredit.trim(),
      coverAlt: coverAlt.trim(),
      videoUrl: videoUrl.trim() || null,
      tags,
      authorName: article.authorName || account.fullName || "Canal Transforma",
      ...(account.isEditor && status === "published"
        ? { correctionNote: correctionNote.trim() || null }
        : {}),
      ...extra,
    });
  };

  const scheduledIso = fromLocalInput(publishAt);
  const scheduleInFuture = Boolean(scheduledIso && new Date(scheduledIso).getTime() > Date.now());

  // Botões conforme papel e situação da matéria.
  const actions = readOnly ? null : (
    <div className="editor-head-actions">
      <button type="button" className="ghost" onClick={() => setPreviewOpen(true)}>
        <Eye size={16} /> Pré-visualizar
      </button>
      {status !== "published" ? (
        <button type="button" className="ghost" disabled={saving} onClick={() => submit("draft")}>
          Salvar rascunho
        </button>
      ) : null}
      {account.isEditor ? (
        <>
          {status === "review" && !isOwn ? (
            <button
              type="button"
              className="ghost"
              disabled={saving}
              onClick={() => setReturnOpen(true)}
            >
              Devolver ao repórter
            </button>
          ) : null}
          {status === "published" ? (
            <>
              <button
                type="button"
                className="ghost"
                disabled={saving}
                onClick={() => submit("draft", { publishAt: null })}
              >
                Despublicar
              </button>
              <button
                type="button"
                className="save"
                disabled={saving}
                onClick={() =>
                  submit("published", scheduleInFuture ? { publishAt: scheduledIso } : {})
                }
              >
                {saving ? <Loader2 size={16} className="spin" /> : null}
                Salvar alterações
              </button>
            </>
          ) : (
            <button
              type="button"
              className="save"
              disabled={saving}
              onClick={() =>
                submit("published", { publishAt: scheduleInFuture ? scheduledIso : null })
              }
            >
              {saving ? <Loader2 size={16} className="spin" /> : null}
              {scheduleInFuture ? "Agendar publicação" : "Publicar agora"}
            </button>
          )}
        </>
      ) : (
        <button type="button" className="save" disabled={saving} onClick={() => submit("review")}>
          {saving ? <Loader2 size={16} className="spin" /> : null}
          {status === "review" ? "Atualizar envio" : "Enviar para revisão"}
        </button>
      )}
    </div>
  );

  const previewData = {
    section,
    color:
      { Cidade: "blue", Política: "red", Serviços: "green", Esportes: "yellow" }[section] ?? "blue",
    title,
    subtitle,
    summary,
    coverUrl,
    coverAlt,
    coverCaption,
    coverCredit,
    videoId,
    author: article.authorName || account.fullName || "Canal Transforma",
    dateLabel: `Publicado em ${formatDate(scheduledIso ?? article.publishedAt ?? new Date().toISOString())}`,
    bodyHtml: previewOpen ? sanitizeArticleHtml(bodyRef.current?.innerHTML ?? "") : "",
    tags,
    correctionNote: correctionNote || null,
  };

  return (
    <main className="admin-page">
      <aside className="admin-side">
        <img src={brand.logoOnCream} alt="Canal Transforma" width={720} height={186} />
        <button
          type="button"
          onClick={() => {
            if (dirty) setLeaveOpen(true);
            else onClose();
          }}
        >
          ← Voltar às matérias
        </button>
        <p className="eyebrow">Informações da matéria</p>
        <p
          className={`editor-status status-${isScheduled({ status, publishedAt: article.publishedAt ?? null }) ? "scheduled" : status}`}
        >
          {statusLabel({ status, publishedAt: article.publishedAt ?? null })}
        </p>
        <label>
          Editoria
          <select
            value={section}
            disabled={readOnly}
            onChange={(e) => {
              setSection(e.target.value as Section);
              markDirty();
            }}
          >
            {sections.map((s) => (
              <option key={s.slug} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Repórter responsável
          <input readOnly value={article.authorName || account.fullName || ""} />
        </label>
        {readOnly && !coverUrl ? null : (
          <label>
            Imagem de capa
            {readOnly ? null : (
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
                    markDirty();
                  } catch (error) {
                    setLocalError(
                      error instanceof Error ? error.message : "Falha ao enviar a capa.",
                    );
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                {coverUrl ? "Trocar capa" : "Enviar capa"}
              </button>
            )}
          </label>
        )}
        {coverUrl ? (
          <div className="cover-preview">
            <img src={coverUrl} alt={coverAlt || "Capa da matéria"} />
            {readOnly ? null : (
              <button
                type="button"
                onClick={() => {
                  setCoverUrl(null);
                  markDirty();
                }}
              >
                Remover capa
              </button>
            )}
          </div>
        ) : null}
        {coverUrl ? (
          <>
            <label>
              Texto alternativo
              <input
                value={coverAlt}
                disabled={readOnly}
                onChange={(e) => {
                  setCoverAlt(e.target.value);
                  markDirty();
                }}
                placeholder="O que aparece na foto"
              />
              <small className="field-hint">Para quem usa leitor de tela e para o Google.</small>
            </label>
            <label>
              Legenda
              <input
                value={coverCaption}
                disabled={readOnly}
                onChange={(e) => {
                  setCoverCaption(e.target.value);
                  markDirty();
                }}
                placeholder="Ex.: Feira na Praça da República"
              />
            </label>
            <label>
              Crédito da foto
              <input
                value={coverCredit}
                disabled={readOnly}
                onChange={(e) => {
                  setCoverCredit(e.target.value);
                  markDirty();
                }}
                placeholder="Ex.: Maria Silva/Canal Transforma"
              />
            </label>
          </>
        ) : null}
        <label>
          Vídeo do YouTube
          <input
            type="url"
            inputMode="url"
            value={videoUrl}
            disabled={readOnly}
            onChange={(e) => {
              setVideoUrl(e.target.value);
              markDirty();
            }}
            placeholder="https://youtu.be/..."
          />
          <small className="field-hint">Opcional. O vídeo entra no topo, no lugar da capa.</small>
        </label>
        {videoId ? (
          <div className="cover-preview video-preview">
            <img src={youtubeThumb(videoId)} alt="Miniatura do vídeo" />
            {readOnly ? null : (
              <button
                type="button"
                onClick={() => {
                  setVideoUrl("");
                  markDirty();
                }}
              >
                Remover vídeo
              </button>
            )}
          </div>
        ) : null}
        <label>
          Assuntos (tags)
          <input
            value={tagsText}
            disabled={readOnly}
            onChange={(e) => {
              setTagsText(e.target.value);
              markDirty();
            }}
            placeholder="saúde, vacinação, bairro Jardim"
          />
          <small className="field-hint">Separe por vírgula. Até 12.</small>
        </label>
        {account.isEditor && !readOnly && status !== "published" ? (
          <label>
            Agendar publicação
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
            <small className="field-hint">Vazio publica na hora. Horário de Brasília.</small>
          </label>
        ) : null}
        {account.isEditor && !readOnly && status === "published" ? (
          <label>
            Registrar correção
            <textarea
              value={correctionNote}
              onChange={(e) => {
                setCorrectionNote(e.target.value);
                markDirty();
              }}
              placeholder="Ex.: A primeira versão informava o horário errado da feira."
            />
            <small className="field-hint">Aparece no fim da matéria, com a data.</small>
          </label>
        ) : null}
        {canDelete(account, article) ? (
          <button type="button" className="danger" onClick={onDelete}>
            <Trash2 size={15} /> Excluir matéria
          </button>
        ) : null}
      </aside>
      <section className="editor-workspace">
        <div className="editor-head">
          <p className="eyebrow">{readOnly ? "Leitura" : "Editor de matéria"}</p>
          {actions}
          {readOnly ? (
            <div className="editor-head-actions">
              <button type="button" className="ghost" onClick={() => setPreviewOpen(true)}>
                <Eye size={16} /> Ver como no site
              </button>
            </div>
          ) : null}
        </div>

        {readOnly ? (
          <p className="admin-flash">
            {article.status === "published"
              ? "Matéria publicada: só um editor altera. Fale com a edição se precisar de correção."
              : "Esta matéria é de outra pessoa: você pode ler, mas não alterar."}
          </p>
        ) : null}
        {article.reviewNote && status !== "published" ? (
          <p className="admin-flash review-note">
            <b>Observação da edição:</b> {article.reviewNote}
          </p>
        ) : null}
        {recovered ? (
          <p className="admin-flash">
            Esta matéria tem alterações que não foram salvas ({formatDate(recovered.savedAt)}).{" "}
            <button type="button" className="link-button" onClick={restoreCopy}>
              Recuperar
            </button>{" "}
            ·{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                try {
                  window.localStorage.removeItem(storageKey);
                } catch {
                  /* nada */
                }
                setRecovered(null);
              }}
            >
              Descartar
            </button>
          </p>
        ) : null}
        {localError ? <p className="admin-flash error">{localError}</p> : null}
        {message ? <p className="admin-flash">{message}</p> : null}
        {uploading ? <p className="admin-flash">Enviando arquivo...</p> : null}

        <label className="field">
          <span className="field-label">
            Título
            <small className={title.length > TITLE_IDEAL ? "is-over" : ""}>
              {title.length}/{TITLE_IDEAL}
            </small>
          </span>
          <input
            value={title}
            disabled={readOnly}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            placeholder="Título da matéria"
          />
        </label>
        <label className="field field-subtitle">
          Linha fina
          <input
            value={subtitle}
            disabled={readOnly}
            onChange={(e) => {
              setSubtitle(e.target.value);
              markDirty();
            }}
            placeholder="Frase logo abaixo do título que completa a informação"
          />
        </label>
        <label className="field">
          <span className="field-label">
            Resumo
            <small className={summary.length > SUMMARY_IDEAL ? "is-over" : ""}>
              {summary.length}/{SUMMARY_IDEAL}
            </small>
          </span>
          <textarea
            value={summary}
            disabled={readOnly}
            onChange={(e) => {
              setSummary(e.target.value);
              markDirty();
            }}
            placeholder="Aparece nos cards da capa, no Google e na prévia do WhatsApp"
          />
        </label>

        {readOnly ? null : (
          <div className="format">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) exec("formatBlock", e.target.value);
                e.target.selectedIndex = 0;
              }}
              aria-label="Estilo do parágrafo"
            >
              <option value="">Estilo do texto</option>
              <option value="p">Parágrafo</option>
              <option value="h2">Intertítulo</option>
              <option value="h3">Intertítulo menor</option>
              <option value="blockquote">Citação</option>
            </select>
            <button type="button" title="Negrito" onClick={() => exec("bold")}>
              <b>B</b>
            </button>
            <button type="button" title="Itálico" onClick={() => exec("italic")}>
              <i>I</i>
            </button>
            <button
              type="button"
              title="Lista com marcadores"
              onClick={() => exec("insertUnorderedList")}
            >
              <List size={16} />
            </button>
            <button type="button" title="Lista numerada" onClick={() => exec("insertOrderedList")}>
              <ListOrdered size={16} />
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
          </div>
        )}

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
                      const safe = (label || href).replace(
                        /[<>&"]/g,
                        (c) => `&#${c.charCodeAt(0)};`,
                      );
                      insertHtml(
                        `<a href="${href.replace(/"/g, "%22")}" target="_blank" rel="noopener noreferrer">${safe}</a>`,
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

        {returnOpen ? (
          <div
            className="link-dialog-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Devolver ao repórter"
          >
            <div className="link-dialog">
              <h3>Devolver ao repórter</h3>
              <label>
                O que precisa mudar
                <textarea
                  autoFocus
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Ex.: Confirmar o horário com a Prefeitura e ouvir um feirante."
                />
              </label>
              <div className="link-dialog-actions">
                <button type="button" className="ghost" onClick={() => setReturnOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="save"
                  disabled={!reviewNote.trim()}
                  onClick={() => {
                    setReturnOpen(false);
                    submit("draft", { reviewNote: reviewNote.trim() });
                  }}
                >
                  Devolver
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div
          ref={bodyRef}
          className="rich-placeholder"
          contentEditable={!readOnly}
          suppressContentEditableWarning
          data-placeholder="Comece a escrever a matéria. Adicione texto, fotos, vídeos e blocos conforme necessário."
          onInput={() => {
            markDirty();
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

        {readOnly ? null : (
          <>
            <div className="block-actions">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" onClick={() => insertColumns(n as 1 | 2 | 3)}>
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
          </>
        )}
      </section>

      {leaveOpen ? (
        <ConfirmDialog
          title="Sair sem salvar?"
          text="As alterações ficam guardadas só neste navegador. Você pode recuperá-las ao abrir a matéria de novo."
          confirmLabel="Sair"
          onCancel={() => setLeaveOpen(false)}
          onConfirm={onClose}
        />
      ) : null}

      {previewOpen ? (
        <div
          className="article-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Pré-visualização"
        >
          <div className="article-preview">
            <div className="article-preview-bar">
              <span>Pré-visualização: é assim que a matéria aparece no portal.</span>
              <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <ArticleView data={previewData} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
