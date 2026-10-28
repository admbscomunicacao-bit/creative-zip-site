import { YOUTUBE_CHANNEL_URL } from "@/lib/youtube";

/** Fonte única dos perfis da marca: cabeçalho, rodapé e páginas usam esta lista. */
export const socialLinks = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/canaltransformaa/",
    handle: "@canaltransformaa",
    path: "M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Zm6.1-8.1a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM21.4 8c-.1-1.5-.4-2.9-1.5-4s-2.5-1.4-4-1.5C14.3 2.4 9.7 2.4 8.1 2.5c-1.5.1-2.9.4-4 1.5S2.6 6.5 2.5 8c-.1 1.6-.1 6.2 0 7.8.1 1.5.4 2.9 1.5 4s2.5 1.4 4 1.5c1.6.1 6.2.1 7.8 0 1.5-.1 2.9-.4 4-1.5s1.4-2.5 1.5-4c.1-1.6.1-6.2 0-7.8Zm-2.1 9.9a3.2 3.2 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.6.4s-4.4.1-5.6-.4a3.2 3.2 0 0 1-1.8-1.8c-.5-1.3-.4-4.3-.4-5.6s-.1-4.4.4-5.6a3.2 3.2 0 0 1 1.8-1.8C7.6 4 10.6 4.1 12 4.1s4.4-.1 5.6.4a3.2 3.2 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.6s.1 4.4-.4 5.6Z",
  },
  {
    name: "YouTube",
    href: YOUTUBE_CHANNEL_URL,
    handle: "@Canaltransformaa",
    path: "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15V9l5.8 3-5.8 3Z",
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@canaltransforma",
    handle: "@canaltransforma",
    path: "M16.6 2h-3.4v13.6a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.3a6.4 6.4 0 1 0 5.4 6.3V8.8a8.2 8.2 0 0 0 4.8 1.5V6.9a4.8 4.8 0 0 1-4.8-4.9Z",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61593190852593",
    handle: "Canal Transforma",
    path: "M14 13.5h2.5l1-4H14v-2c0-1 0-2 2-2h1.5V2.1C17.2 2.1 15.9 2 14.6 2 11.9 2 10 3.7 10 6.7v2.8H7v4h3V22h4v-8.5Z",
  },
] as const;

export function SocialIcon({ path, size = 18 }: { path: string; size?: number | undefined }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function SocialRow({
  className = "social-row",
  size,
}: {
  className?: string;
  size?: number | undefined;
}) {
  return (
    <div className={className}>
      {socialLinks.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`${s.name} do Canal Transforma`}
          title={s.name}
        >
          <SocialIcon path={s.path} size={size} />
        </a>
      ))}
    </div>
  );
}
