import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { EditorialShell, useRequireEditorialAccount } from "@/components/editorial-shell";
import {
  deleteEditorialUser,
  listAuditLog,
  listEditorialUsers,
  setUserRole,
  setUserStatus,
  type AccountStatus,
  type AppRole,
} from "@/lib/editorial.functions";

export const Route = createFileRoute("/editorial/usuarios")({
  validateSearch: (search: Record<string, unknown>) => ({
    u: typeof search["u"] === "string" ? (search["u"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Usuários editoriais — Canal Transforma" },
      {
        name: "description",
        content:
          "Painel administrativo para aprovar, bloquear e definir papéis das contas editoriais do Canal Transforma.",
      },
      { property: "og:title", content: "Usuários editoriais — Canal Transforma" },
      {
        property: "og:description",
        content: "Administração de contas da redação do Canal Transforma.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersAdmin,
});

const statusLabel: Record<AccountStatus, string> = {
  pending: "aguardando aprovação",
  approved: "aprovado",
  blocked: "bloqueado",
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" }) : "—";

function UsersAdmin() {
  const { data: account, isLoading } = useRequireEditorialAccount({ requireEditorialAccess: true });
  const navigate = useNavigate();
  const { u: selectedId } = Route.useSearch();
  const fetchUsers = useServerFn(listEditorialUsers);
  const fetchAudit = useServerFn(listAuditLog);
  const changeStatus = useServerFn(setUserStatus);
  const changeRole = useServerFn(setUserRole);
  const removeUser = useServerFn(deleteEditorialUser);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const users = useQuery({
    queryKey: ["editorial-users"],
    queryFn: () => fetchUsers(),
    enabled: Boolean(account?.isAdmin),
    retry: false,
  });

  const audit = useQuery({
    queryKey: ["editorial-audit"],
    queryFn: () => fetchAudit(),
    enabled: Boolean(account?.isAdmin),
    retry: false,
  });

  const rows = users.data ?? [];
  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const select = (id: string | undefined) =>
    void navigate({ to: "/editorial/usuarios", search: { u: id }, replace: true });

  const act = async (fn: () => Promise<unknown>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
      await users.refetch();
      await audit.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ação não permitida.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !account) {
    return (
      <EditorialShell eyebrow="Administração" title="Usuários editoriais">
        <p className="login-message">Verificando suas permissões...</p>
      </EditorialShell>
    );
  }

  if (!account.isAdmin) {
    return (
      <EditorialShell eyebrow="Administração" title="Acesso restrito" backTo="/editorial/redacao">
        <p className="login-message login-error">
          Esta área é exclusiva de administradores aprovados.
        </p>
      </EditorialShell>
    );
  }

  if (selected) {
    const userAudit = (audit.data ?? []).filter(
      (row) => row.targetUserId === selected.id || row.actorId === selected.id,
    );
    return (
      <EditorialShell
        eyebrow="Administração"
        title={selected.fullName || selected.email}
        intro="Dados completos da conta editorial."
        backTo="/editorial/usuarios"
        backLabel="← Voltar para a lista"
      >
        {error && <p className="login-message login-error">{error}</p>}
        <dl className="user-detail-grid">
          <div>
            <dt>Nome completo</dt>
            <dd>{selected.fullName || "—"}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{selected.email || "—"}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{selected.phone || "—"}</dd>
          </div>
          <div>
            <dt>Status da conta</dt>
            <dd>
              <span className={`status-pill status-${selected.status}`}>
                {statusLabel[selected.status]}
              </span>
            </dd>
          </div>
          <div>
            <dt>Papel</dt>
            <dd>{selected.roles.includes("admin") ? "Administrador" : "Repórter"}</dd>
          </div>
          <div>
            <dt>Cadastro criado em</dt>
            <dd>{formatDate(selected.createdAt)}</dd>
          </div>
        </dl>

        <div className="admin-actions user-detail-actions">
          {(["approved", "pending", "blocked"] as AccountStatus[])
            .filter((s) => s !== selected.status)
            .map((s) => (
              <button
                key={s}
                type="button"
                className="editorial-secondary"
                disabled={busy}
                onClick={() => act(() => changeStatus({ data: { userId: selected.id, status: s } }))}
              >
                {s === "approved" ? "Aprovar conta" : s === "blocked" ? "Bloquear" : "Deixar pendente"}
              </button>
            ))}
          {(["reporter", "admin"] as AppRole[])
            .filter((r) => !selected.roles.includes(r))
            .map((r) => (
              <button
                key={r}
                type="button"
                className="editorial-secondary"
                disabled={busy}
                onClick={() => act(() => changeRole({ data: { userId: selected.id, role: r } }))}
              >
                Tornar {r === "admin" ? "administrador" : "repórter"}
              </button>
            ))}
          {selected.id !== account.userId ? (
            <button
              type="button"
              className="editorial-secondary danger"
              disabled={busy}
              onClick={() => {
                if (!window.confirm("Excluir definitivamente esta conta editorial?")) return;
                void act(async () => {
                  await removeUser({ data: { userId: selected.id } });
                  select(undefined);
                });
              }}
            >
              Excluir conta
            </button>
          ) : null}
        </div>

        <h2 className="admin-subtitle">Histórico da conta</h2>
        {userAudit.length === 0 ? (
          <p className="password-hint">Nenhum registro ainda.</p>
        ) : (
          <ul className="audit-list">
            {userAudit.map((row) => (
              <li key={row.id}>
                <strong>{row.action}</strong> — {formatDate(row.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </EditorialShell>
    );
  }

  return (
    <EditorialShell
      eyebrow="Administração"
      title="Usuários editoriais"
      intro="Toda conta nova entra aqui como “aguardando aprovação”. Clique em uma pessoa para ver os dados e aprovar, bloquear ou excluir."
      backTo="/editorial/redacao"
      backLabel="← Voltar para a redação"
    >
      {error && <p className="login-message login-error">{error}</p>}
      {users.isLoading ? (
        <p className="login-message">Carregando contas...</p>
      ) : users.error ? (
        <p className="login-message login-error">{(users.error as Error).message}</p>
      ) : rows.length === 0 ? (
        <p className="password-hint">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="reporter-list">
          {rows.map((u) => (
            <button type="button" key={u.id} onClick={() => select(u.id)}>
              <b>{u.fullName || u.email}</b>
              <span>
                {u.roles.includes("admin") ? "Administrador" : "Repórter"} ·{" "}
                {statusLabel[u.status]} · {u.email}
              </span>
              <ArrowRight size={20} />
            </button>
          ))}
        </div>
      )}
    </EditorialShell>
  );
}
