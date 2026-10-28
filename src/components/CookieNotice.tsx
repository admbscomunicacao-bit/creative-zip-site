import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";

const KEY = "ct-cookies-ok";

/** Aviso de cookies (LGPD), exibido só quando os anúncios do AdSense estão ligados. */
export function CookieNotice() {
  const { adsenseEnabled } = useSiteSettings();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!adsenseEnabled) return;
    try {
      setShow(localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, [adsenseEnabled]);

  if (!show) return null;

  return (
    <div className="cookie-notice" role="region" aria-label="Aviso de cookies">
      <p>
        Usamos cookies para exibir anúncios e medir a audiência, o que mantém o jornalismo local
        gratuito. Saiba mais na <Link to="/privacidade">política de privacidade</Link>.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            // Sem armazenamento: o aviso só some nesta visita.
          }
          setShow(false);
        }}
      >
        Entendi
      </button>
    </div>
  );
}
