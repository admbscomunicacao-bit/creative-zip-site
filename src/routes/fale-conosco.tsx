import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { InfoPage, infoHead } from "@/components/InfoPage";
import { sendContactMessage } from "@/lib/contact.functions";

type Subject = "pauta" | "correcao" | "outro";

export const Route = createFileRoute("/fale-conosco")({
  validateSearch: (search: Record<string, unknown>): { assunto?: Subject } =>
    search["assunto"] === "correcao" || search["assunto"] === "outro"
      ? { assunto: search["assunto"] as Subject }
      : {},
  head: () =>
    infoHead(
      "/fale-conosco",
      "Envie sua pauta",
      "Sugira uma pauta, peça uma correção ou fale com a redação do Canal Transforma.",
    ),
  component: ContactPage,
});

function ContactPage() {
  const { assunto } = Route.useSearch();
  const send = useServerFn(sendContactMessage);
  const [openedAt, setOpenedAt] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: (assunto ?? "pauta") as Subject,
    message: "",
    website: "",
  });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  useEffect(() => setOpenedAt(Date.now()), []);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <InfoPage
      eyebrow="Fale com a redação"
      title="Envie sua pauta"
      intro="Viu algo na cidade que merece ser apurado? Encontrou um erro numa matéria? Conte para a gente. Quem responde é a redação."
    >
      {state === "sent" ? (
        <div className="contact-done" role="status">
          <h2>Recebemos sua mensagem.</h2>
          <p>
            A redação vai ler e, se precisar, responde no e-mail que você informou. Obrigado por
            ajudar a apurar o que acontece em Catanduva.
          </p>
        </div>
      ) : (
        <form
          className="contact-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setState("sending");
            try {
              await send({ data: { ...form, openedAt } });
              setState("sent");
            } catch (err) {
              const text = err instanceof Error ? err.message : "";
              setError(
                /\[|\{/.test(text)
                  ? "Confira os campos: nome, e-mail válido e mensagem com pelo menos 15 caracteres."
                  : text || "Não foi possível enviar. Tente de novo.",
              );
              setState("idle");
            }
          }}
        >
          <label>
            Assunto
            <select value={form.subject} onChange={set("subject")}>
              <option value="pauta">Sugestão de pauta</option>
              <option value="correcao">Pedido de correção</option>
              <option value="outro">Outro assunto</option>
            </select>
          </label>
          <label>
            Seu nome
            <input required value={form.name} onChange={set("name")} autoComplete="name" />
          </label>
          <label>
            Seu e-mail
            <input
              required
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="email"
            />
          </label>
          <label>
            Telefone ou WhatsApp <small>(opcional)</small>
            <input value={form.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" />
          </label>
          <label>
            Mensagem
            <textarea
              required
              minLength={15}
              value={form.message}
              onChange={set("message")}
              placeholder={
                form.subject === "correcao"
                  ? "Qual matéria e qual informação está errada?"
                  : "O que aconteceu, onde e quando? Se tiver, diga quem pode confirmar."
              }
            />
          </label>
          <label className="contact-trap" aria-hidden="true">
            Site
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={set("website")}
            />
          </label>
          {error ? (
            <p className="contact-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Enviando..." : "Enviar para a redação"}
          </button>
          <p className="contact-note">
            Seus dados são usados só para responder esta mensagem. Veja a{" "}
            <a href="/privacidade">política de privacidade</a>.
          </p>
        </form>
      )}
    </InfoPage>
  );
}
