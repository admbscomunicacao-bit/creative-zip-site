export type Section = "Cidade" | "Política" | "Serviços" | "Esportes";
export type SectionColor = "blue" | "red" | "green" | "yellow";

export type Story = {
  slug: string;
  section: Section;
  title: string;
  summary: string;
  date: string;
  color: SectionColor;
  image: string;
  /** A reportagem tem vídeo do YouTube: os cards mostram o selo de vídeo. */
  hasVideo?: boolean;
};

export const sections: { name: Section; slug: string; color: SectionColor }[] = [
  { name: "Cidade", slug: "cidade", color: "blue" },
  { name: "Política", slug: "politica", color: "red" },
  { name: "Serviços", slug: "servicos", color: "green" },
  { name: "Esportes", slug: "esportes", color: "yellow" },
];

export const sectionBySlug = (slug: string) => sections.find((s) => s.slug === slug);
