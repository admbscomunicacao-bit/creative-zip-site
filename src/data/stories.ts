export type Section = "Cidade" | "Política" | "Serviços" | "Esportes";
export type SectionColor = "blue" | "red" | "green" | "yellow";

export type Story = {
  slug: string;
  section: Section;
  title: string;
  summary: string;
  date: string;
  color: SectionColor;
  featured?: boolean;
  image: string;
};

export const sections: { name: Section; slug: string; color: SectionColor }[] = [
  { name: "Cidade", slug: "cidade", color: "blue" },
  { name: "Política", slug: "politica", color: "red" },
  { name: "Serviços", slug: "servicos", color: "green" },
  { name: "Esportes", slug: "esportes", color: "yellow" },
];

export const sectionBySlug = (slug: string) => sections.find((s) => s.slug === slug);

export const stories: Story[] = [
  {
    slug: "novo-calendario-de-manutencao",
    section: "Cidade",
    title: "Bairros recebem novo calendário de manutenção urbana",
    summary: "Programação demonstra como a cidade pode organizar serviços por região.",
    date: "06 de ago. de 2026, 9:10",
    color: "blue",
    featured: true,
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=82",
  },
  {
    slug: "horarios-de-vacinacao",
    section: "Serviços",
    title: "Unidades ampliam horários de vacinação nesta semana",
    summary:
      "Confira como uma pauta de serviço pode orientar a rotina de quem mora na cidade.",
    date: "06 de ago. de 2026, 8:42",
    color: "green",
    featured: true,
    image:
      "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1600&q=82",
  },
  {
    slug: "agenda-cultural-escolas",
    section: "Cidade",
    title: "Escolas recebem novo ciclo de atividades culturais",
    summary: "A agenda reúne ações e informações para famílias e estudantes.",
    date: "06 de ago. de 2026, 8:05",
    color: "blue",
    featured: true,
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1600&q=82",
  },
  {
    slug: "rodada-regional",
    section: "Esportes",
    title: "Equipes da cidade se preparam para a rodada regional",
    summary: "O esporte local ganha espaço com serviço, calendário e contexto.",
    date: "06 de ago. de 2026, 7:28",
    color: "yellow",
    featured: true,
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1600&q=82",
  },
  {
    slug: "conselho-de-bairro",
    section: "Política",
    title: "Conselho de bairro abre escuta para propostas da comunidade",
    summary: "Entenda como participar e acompanhar os próximos encontros.",
    date: "05 de ago. de 2026, 18:20",
    color: "red",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=82",
  },
  {
    slug: "feira-noturna",
    section: "Cidade",
    title: "Feira noturna terá edição especial no fim de semana",
    summary: "Programação reúne gastronomia, artesanato e música local.",
    date: "05 de ago. de 2026, 17:35",
    color: "blue",
    image:
      "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1600&q=82",
  },
  {
    slug: "atendimento-digital",
    section: "Serviços",
    title: "Atendimento digital facilita consulta a serviços municipais",
    summary: "Passo a passo simples para encontrar os canais de atendimento.",
    date: "05 de ago. de 2026, 16:10",
    color: "green",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=82",
  },
  {
    slug: "circuito-de-corrida",
    section: "Esportes",
    title: "Circuito de corrida abre inscrições para nova etapa",
    summary: "Evento terá modalidades para diferentes perfis de participantes.",
    date: "05 de ago. de 2026, 14:55",
    color: "yellow",
    image:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1600&q=82",
  },
  {
    slug: "audiencia-mobilidade",
    section: "Política",
    title: "Audiência pública debate mobilidade e transporte urbano",
    summary: "Encontro abre espaço para propostas sobre circulação e acessibilidade.",
    date: "04 de ago. de 2026, 16:30",
    color: "red",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=82",
  },
  {
    slug: "biblioteca-itinerante",
    section: "Cidade",
    title: "Biblioteca itinerante leva leitura a novos pontos da cidade",
    summary: "Veículo com acervo circula por bairros durante a próxima semana.",
    date: "04 de ago. de 2026, 16:05",
    color: "blue",
    image:
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=82",
  },
];
