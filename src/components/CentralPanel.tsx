import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { SocialIcon, socialLinks } from "@/components/social";
import {
  getSiteSettings,
  updateSiteSettings,
  type SiteSettings,
} from "@/lib/site.functions";
import { YOUTUBE_CHANNEL_URL, youtubeThumb, youtubeVideoId } from "@/lib/youtube";

/**
 * Central do canal: o painel liga o portal aos outros meios da marca.
 * Repórteres ligam e desligam a live; canal do YouTube e AdSense ficam com administradores.
 */
export function CentralPanel({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const fetchSettings = useServerFn(getSiteSettings);
  const persist = useServerFn(updateSiteSettings);
  const query = useQuery({ queryKey: ["site-settings"], queryFn: () => fetchSettings() });
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (query.data && !form) setForm(query.data);
  }, [query.data, form]);

  if (!form) return <p>Carregando a central do canal...</p>;

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async (next: SiteSettings, success: string) => {
    setSaving(true);
    setFlash(null);
    try {
      const saved = await persist({
        data: {
          liveActive: next.liveActive,
          liveUrl: next.liveUrl?.trim() || null,
          liveTitle: next.liveTitle.trim(),
          youtubeChannelId: next.youtubeChannelId.trim(),
          adsenseClient: next.adsenseClient?.trim() || null,
          adsenseEnabled: next.adsenseEnabled,
        },
      });
      setForm(saved);
      setFlash({ text: success });
      await router.invalidate();
    } catch (error) {
      setFlash({
        text: error instanceof Error ? error.message : "Não foi possível salvar.",
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const liveId = youtubeVideoId(form.liveUrl);

  return (
    <div className="central">
      {flash ? <p className={`admin-flash${flash.error ? " error" : ""}`}>{flash.text}</p> : null}

      <section className={`central-card central-live${form.liveActive ? " is-on" : ""}`}>
        <header>
          <div>
            <p className="eyebrow">Transmissão</p>
            <h2>Live no YouTube</h2>
          </div>
          <span className="central-status">
            <i aria-hidden="true" />
            {form.liveActive ? "No ar no portal" : "Fora do ar"}
          </span>
        </header>
        <p className="central-note">
          Ao ligar, todas as páginas mostram a faixa AO VIVO com o link da live, e a capa troca o
          vídeo em destaque pelo player da transmissão. Desligue quando a live terminar.
        </p>
        <div className="central-fields">
          <label>
            Link da live
            <input
              type="url"
              inputMode="url"
              value={form.liveUrl ?? ""}
              onChange={(e) => set("liveUrl", e.target.value)}
              placeholder="https://www.youtube.com/live/..."
            />
          </label>
          <label>
            Título na faixa
            <input
              value={form.liveTitle}
              maxLength={140}
              onChange={(e) => set("liveTitle", e.target.value)}
              placeholder="Ex.: Transforma Debate: as obras da Avenida São Domingos"
            />
          </label>
        </div>
        {liveId ? (
          <img className="central-thumb" src={youtubeThumb(liveId)} alt="Miniatura da live" />
        ) : null}
        <div className="central-actions">
          {form.liveActive ? (
            <>
              <button
                type="button"
                className="central-primary is-stop"
                disabled={saving}
                onClick={() => save({ ...form, liveActive: false }, "Faixa AO VIVO desligada.")}
              >
                {saving ? <Loader2 size={16} className="spin" /> : null}
                Encerrar live no portal
              </button>
              <button
                type="button"
                className="central-secondary"
                disabled={saving}
                onClick={() => save(form, "Dados da live atualizados.")}
              >
                Salvar título e link
              </button>
            </>
          ) : (
            <button
              type="button"
              className="central-primary"
              disabled={saving}
              onClick={() =>
                save({ ...form, liveActive: true }, "Faixa AO VIVO ligada em todo o portal.")
              }
            >
              {saving ? <Loader2 size={16} className="spin" /> : null}
              Estamos ao vivo
            </button>
          )}
        </div>
      </section>

      <section className="central-card">
        <header>
          <div>
            <p className="eyebrow">Vídeos</p>
            <h2>Canal do YouTube</h2>
          </div>
          <a href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noreferrer" className="central-link">
            Abrir canal <ExternalLink size={14} />
          </a>
        </header>
        <p className="central-note">
          Os vídeos novos do canal entram sozinhos na capa e na página Vídeos e lives, em até 15
          minutos depois de publicados no YouTube.
        </p>
        <label>
          ID do canal
          <input
            value={form.youtubeChannelId}
            readOnly={!isAdmin}
            onChange={(e) => set("youtubeChannelId", e.target.value)}
          />
        </label>
        {isAdmin ? (
          <div className="central-actions">
            <button
              type="button"
              className="central-secondary"
              disabled={saving}
              onClick={() => save(form, "Canal do YouTube atualizado.")}
            >
              Salvar canal
            </button>
          </div>
        ) : null}
      </section>

      <section className="central-card">
        <header>
          <div>
            <p className="eyebrow">Receita</p>
            <h2>Google AdSense</h2>
          </div>
          <span className={`central-status${form.adsenseEnabled ? " is-ok" : ""}`}>
            <i aria-hidden="true" />
            {form.adsenseEnabled ? "Anúncios ativos" : "Anúncios desligados"}
          </span>
        </header>
        <p className="central-note">
          Com os anúncios ativos, o portal carrega os anúncios automáticos do Google, publica o
          arquivo <a href="/ads.txt" target="_blank" rel="noreferrer">ads.txt</a> e mostra o aviso
          de cookies exigido pela LGPD.
          {isAdmin ? null : " Só administradores alteram esta área."}
        </p>
        <label>
          ID de editor
          <input
            value={form.adsenseClient ?? ""}
            readOnly={!isAdmin}
            onChange={(e) => set("adsenseClient", e.target.value)}
            placeholder="ca-pub-0000000000000000"
          />
        </label>
        {isAdmin ? (
          <div className="central-actions">
            <label className="central-switch">
              <input
                type="checkbox"
                checked={form.adsenseEnabled}
                onChange={(e) => set("adsenseEnabled", e.target.checked)}
              />
              Exibir anúncios no portal
            </label>
            <button
              type="button"
              className="central-secondary"
              disabled={saving}
              onClick={() => save(form, "Configuração do AdSense salva.")}
            >
              Salvar AdSense
            </button>
          </div>
        ) : null}
      </section>

      <section className="central-card">
        <header>
          <div>
            <p className="eyebrow">Redes</p>
            <h2>Perfis conectados ao portal</h2>
          </div>
        </header>
        <p className="central-note">
          Aparecem no topo, no menu e no rodapé, e são informados ao Google como perfis oficiais da
          marca. Cada reportagem tem botões para compartilhar no WhatsApp, Facebook e X.
        </p>
        <ul className="central-socials">
          {socialLinks.map((s) => (
            <li key={s.name}>
              <SocialIcon path={s.path} size={18} />
              <b>{s.name}</b>
              <a href={s.href} target="_blank" rel="noreferrer">
                {s.handle}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
