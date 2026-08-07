import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { EditorialShell, useRequireEditorialAccount } from "@/components/editorial-shell";
import {
  listAuditLog,
  listEditorialUsers,
  setUserRole,
  setUserStatus,
  type AccountStatus,
  type AppRole,
} from "@/lib/editorial.functions";

export const Route = createFileRoute("/editorial/usuarios")({
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

function UsersAdmin() {
  const { data: account, isLoading } = useRequireEditorialAccount({ requireEditorialAccess: true });
  const fetchUsers = useServerFn(listEditorialUsers);
  const fetchAudit = useServerFn(listAuditLog);
  const changeStatus = useServerFn(setUserStatus);
  const changeRole = useServerFn(setUserRole);
  const [error, setError] = useState("");

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

  const act = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await users.refetch();
      await audit.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ação não permitida.");
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

  return (
    <EditorialShell
      eyebrow="Administração"
      title="Usuários editoriais"
      intro="Aprove, bloqueie e defina o papel de cada conta. Contas bloqueadas perdem o acesso imediatamente."
      backTo="/editorial/redacao"
      backLabel="← Voltar para a redação"
    >
      {error && <p className="login-message login-error">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Status</th>
              <th>Papel</th>
              <th>Telefone</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.fullName || "—"}</strong>
                  <br />
                  <span className="password-hint">{u.email}</span>
                </td>
                <td>
                  <span className={`status-pill status-${u.status}`}>{u.status}</span>
                </td>
                <td>{u.roles.join(", ") || "—"}</td>
                <td>{u.phone || "—"}</td>
                <td className="admin-actions">
                  {(["approved", "pending", "blocked"] as AccountStatus[])
                    .filter((s) => s !== u.status)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="editorial-secondary"
                        onClick={() => act(() => changeStatus({ data: { userId: u.id, status: s } }))}
                      >
                        {s === "approved" ? "Aprovar" : s === "blocked" ? "Bloquear" : "Pendente"}
                      </button>
                    ))}
                  {(["reporter", "admin"] as AppRole[])
                    .filter((r) => !u.roles.includes(r))
                    .map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="editorial-secondary"
                        onClick={() => act(() => changeRole({ data: { userId: u.id, role: r } }))}
                      >
                        Tornar {r === "admin" ? "admin" : "repórter"}
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="admin-subtitle">Registro de auditoria</h2>
      <ul className="audit-list">
        {(audit.data ?? []).map((row) => (
          <li key={row.id}>
            <strong>{row.action}</strong> — {new Date(row.createdAt).toLocaleString("pt-BR")}
            <br />
            <span className="password-hint">{row.detail}</span>
          </li>
        ))}
      </ul>
    </EditorialShell>
  );
}
