import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { SocialIcon } from "@/components/social";

const WHATSAPP =
  "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z";
const FACEBOOK =
  "M14 13.5h2.5l1-4H14v-2c0-1 0-2 2-2h1.5V2.1C17.2 2.1 15.9 2 14.6 2 11.9 2 10 3.7 10 6.7v2.8H7v4h3V22h4v-8.5Z";
const X_LOGO =
  "M17.8 3h3.1l-6.8 7.7 8 10.3h-6.2l-4.9-6.3L5.4 21H2.3l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z";

/** Compartilhamento da reportagem: as redes leem título e capa das metatags da página. */
export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  const text = encodeURIComponent(`${title} | Canal Transforma`);
  const link = encodeURIComponent(url);
  const targets = [
    { name: "WhatsApp", path: WHATSAPP, href: `https://wa.me/?text=${text}%20${link}` },
    {
      name: "Facebook",
      path: FACEBOOK,
      href: `https://www.facebook.com/sharer/sharer.php?u=${link}`,
    },
    { name: "X", path: X_LOGO, href: `https://twitter.com/intent/tweet?text=${text}&url=${link}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copie o link da reportagem:", url);
    }
  };

  return (
    <div className="share-bar" aria-label="Compartilhar reportagem">
      <span className="share-label">Compartilhe</span>
      {targets.map((t) => (
        <a
          key={t.name}
          href={t.href}
          target="_blank"
          rel="noreferrer"
          className={`share-btn share-${t.name.toLowerCase()}`}
          aria-label={`Compartilhar no ${t.name}`}
        >
          <SocialIcon path={t.path} size={17} />
        </a>
      ))}
      <button type="button" className="share-btn" onClick={copy} aria-label="Copiar link">
        {copied ? <Check size={17} /> : <Link2 size={17} />}
      </button>
      {canShare ? (
        <button
          type="button"
          className="share-btn share-native"
          onClick={() => void navigator.share({ title, url }).catch(() => undefined)}
          aria-label="Mais opções de compartilhamento"
        >
          <Share2 size={17} />
        </button>
      ) : null}
      <span className="share-feedback" role="status">
        {copied ? "Link copiado" : ""}
      </span>
    </div>
  );
}
