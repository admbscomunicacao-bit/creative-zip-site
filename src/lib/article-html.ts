const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "div",
  "em",
  "figcaption",
  "figure",
  "h2",
  "h3",
  "i",
  "img",
  "p",
  "source",
  "span",
  "strong",
  "u",
  "video",
]);

const ALLOWED_CLASSES = new Set([
  "article-column",
  "article-columns",
  "article-gallery-item",
  "article-paragraph",
  "cols-1",
  "cols-2",
  "cols-3",
]);

function safeUrl(value: string, type: "href" | "src"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (type === "href" && /^(https?:|mailto:|tel:|\/)/i.test(trimmed)) return trimmed;
  if (type === "src" && /^https:\/\//i.test(trimmed)) return trimmed;
  return null;
}

function safeStyle(value: string): string | null {
  const declarations = value.split(";").flatMap((declaration) => {
    const [property, ...rest] = declaration.split(":");
    const name = property?.trim().toLowerCase();
    const raw = rest.join(":").trim();
    if (!name || !raw || /(?:url|expression|@import|javascript:|<|>)/i.test(raw)) return [];

    const allowed =
      (name === "color" && /^(#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\)|hsla?\([0-9.,%\s]+\)|[a-z]+)$/i.test(raw)) ||
      (name === "font-size" && /^\d{1,3}(?:px|pt|em|rem|%)$/i.test(raw)) ||
      (name === "font-family" && /^[a-z0-9\s,'"-]{1,120}$/i.test(raw)) ||
      (name === "font-weight" && /^(normal|bold|[1-9]00)$/i.test(raw)) ||
      (name === "font-style" && /^(normal|italic)$/i.test(raw)) ||
      (name === "text-decoration" && /^(none|underline)$/i.test(raw)) ||
      (name === "text-align" && /^(left|right|center|justify)$/i.test(raw));

    return allowed ? [`${name}:${raw}`] : [];
  });
  return declarations.length ? declarations.join(";") : null;
}

function attributeValue(raw: string): string {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Allows only the small editorial markup vocabulary produced by the article editor.
 * This runs on the server before persistence and again when public content is read,
 * so older articles cannot turn rich text into executable markup.
 */
export function sanitizeArticleHtml(input: string): string {
  if (!input) return "";

  const withoutDangerousBlocks = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|svg|math)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|svg|math)\b[^>]*\/?\s*>/gi, "");

  return withoutDangerousBlocks.replace(/<\s*(\/?)\s*([a-z0-9-]+)([^>]*)>/gi, (_match, closing, rawTag, rawAttributes) => {
    const tag = String(rawTag).toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) return `</${tag}>`;

    const attributes: string[] = [];
    const found = new Map<string, string>();
    const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
    for (const entry of rawAttributes.matchAll(attributePattern)) {
      const name = entry[1]?.toLowerCase();
      const rawValue = entry[2];
      if (!name || rawValue === undefined || name.startsWith("on")) continue;
      found.set(name, attributeValue(rawValue));
    }

    if (tag === "a") {
      const href = safeUrl(found.get("href") ?? "", "href");
      if (href) attributes.push(`href="${escapeAttribute(href)}"`, 'target="_blank"', 'rel="noopener noreferrer"');
    }
    if (tag === "img" || tag === "video" || tag === "source") {
      const src = safeUrl(found.get("src") ?? "", "src");
      if (!src && tag !== "video") return "";
      if (src) attributes.push(`src="${escapeAttribute(src)}"`);
    }
    if (tag === "img" && found.has("alt")) attributes.push(`alt="${escapeAttribute(found.get("alt") ?? "")}"`);
    if (tag === "video") attributes.push("controls", 'preload="metadata"');
    if (tag === "source" && /^(video\/(mp4|webm))$/i.test(found.get("type") ?? "")) {
      attributes.push(`type="${found.get("type")}"`);
    }
    if (["div", "p", "span"].includes(tag)) {
      const classes = (found.get("class") ?? "").split(/\s+/).filter((value) => ALLOWED_CLASSES.has(value));
      if (classes.length) attributes.push(`class="${classes.join(" ")}"`);
      const style = safeStyle(found.get("style") ?? "");
      if (style) attributes.push(`style="${escapeAttribute(style)}"`);
      if (tag === "p" && found.has("data-ph")) attributes.push(`data-ph="${escapeAttribute(found.get("data-ph") ?? "")}"`);
      if (tag === "div" && found.has("data-columns") && /^[1-3]$/.test(found.get("data-columns") ?? "")) {
        attributes.push(`data-columns="${found.get("data-columns")}"`);
      }
    }

    const suffix = attributes.length ? ` ${attributes.join(" ")}` : "";
    return `<${tag}${suffix}>`;
  });
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
