/** Janela de confirmação do painel (substitui o confirm() do navegador). */
export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="link-dialog-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="link-dialog">
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="link-dialog-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="save danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
