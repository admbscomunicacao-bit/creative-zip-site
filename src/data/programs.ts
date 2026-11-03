/**
 * Programação ao vivo do Canal Transforma no YouTube.
 * Fonte: "Cronograma Canal Transforma atualizado" (03/11/2026). Nome, dia, horário e
 * apresentador seguem o cronograma; os resumos foram escritos a partir das propostas.
 * Para mudar a grade, edite só esta lista.
 */
export type Program = {
  slug: string;
  name: string;
  host: string;
  /** 0 = domingo … 6 = sábado (horário de Brasília). */
  weekday: number;
  /** "HH:MM", horário de Brasília. */
  time: string;
  summary: string;
  /** Editoria mais próxima, para a cor do card. */
  color: "blue" | "red" | "green" | "yellow";
};

export const programs: Program[] = [
  {
    slug: "toque-e-passe",
    name: "Toque e Passe",
    host: "Matheus Dolensi Zucoloto",
    weekday: 1,
    time: "14:00",
    summary:
      "O esporte de Catanduva ao Brasil: resultados, bastidores, entrevistas e análises do futebol e de outras modalidades.",
    color: "yellow",
  },
  {
    slug: "educacao-em-dialogo",
    name: "Educação em Diálogo",
    host: "Cláudia Cosmo",
    weekday: 1,
    time: "19:00",
    summary:
      "Conversas com diretores, professores e educadores sobre experiências que dão certo e os desafios da educação.",
    color: "blue",
  },
  {
    slug: "gestao-em-foco",
    name: "Gestão em Foco",
    host: "Maurício Riva",
    weekday: 1,
    time: "21:00",
    summary:
      "Secretários, diretores e servidores explicam como funcionam os serviços da Prefeitura e o que chega à população.",
    color: "red",
  },
  {
    slug: "cultura-em-movimento",
    name: "Cultura em Movimento",
    host: "Rafael Pack",
    weekday: 2,
    time: "19:00",
    summary:
      "Artistas, grupos e oficinas que fazem a cultura de Catanduva: dança, teatro, música, artes visuais e memória.",
    color: "green",
  },
  {
    slug: "pessoas-iluminadas",
    name: "Pessoas Iluminadas",
    host: "Denise Cursino",
    weekday: 3,
    time: "19:00",
    summary:
      "Histórias de pessoas de Catanduva que inspiram: superação, trabalho, solidariedade e empreendedorismo.",
    color: "blue",
  },
  {
    slug: "bem-estar-animal",
    name: "Bem-Estar Animal",
    host: "Ivania Soldati",
    weekday: 4,
    time: "19:00",
    summary:
      "Adoção, saúde, castração e combate aos maus-tratos, com veterinários, protetores e quem cuida da causa animal.",
    color: "green",
  },
  {
    slug: "som-e-vida",
    name: "Som & Vida",
    host: "Fabiana Chiodini",
    weekday: 5,
    time: "19:00",
    summary:
      "Música de todos os estilos, com prioridade para os artistas e novos talentos de Catanduva e região.",
    color: "yellow",
  },
];

export const weekdayName = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** "19:00" → "19h"; "14:30" → "14h30". */
export const hourLabel = (time: string) => {
  const [h, m] = time.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
};

/** Dia da semana e minutos do dia no horário de Brasília. */
function brasiliaNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Próximo programa a partir de agora (o que começou há menos de 1 hora ainda conta,
 * porque pode estar no ar). Devolve também se é hoje.
 */
export function nextProgram(now: Date): { program: Program; today: boolean } | null {
  if (!programs.length) return null;
  const { weekday, minutes } = brasiliaNow(now);
  const ordered = [...programs].sort(
    (a, b) => a.weekday - b.weekday || minutesOf(a.time) - minutesOf(b.time),
  );
  for (let offset = 0; offset < 8; offset += 1) {
    const day = (weekday + offset) % 7;
    const found = ordered.find(
      (p) => p.weekday === day && (offset > 0 || minutesOf(p.time) + 60 > minutes),
    );
    if (found) return { program: found, today: offset === 0 };
  }
  return null;
}
