// HTML autônomo: é servido quando o servidor falha, então não depende do CSS do app.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Esta página não carregou | Canal Transforma</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#4A72B6" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <style>
      body { font: 16px/1.55 Inter, system-ui, -apple-system, sans-serif; background: #F6F2E9; color: #20314C; display: grid; place-items: center; min-height: 100dvh; margin: 0; padding: 1.5rem; }
      .card { max-width: 34rem; width: 100%; }
      img { width: 96px; height: auto; display: block; margin-bottom: 1rem; }
      h1 { font: 700 2rem/1.1 Montserrat, system-ui, sans-serif; color: #1B318F; margin: 0 0 0.75rem; }
      p { color: #55617A; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.625rem; flex-wrap: wrap; }
      a, button { padding: 0.8rem 1.1rem; border-radius: 8px; font: 700 0.875rem Inter, system-ui, sans-serif; cursor: pointer; text-decoration: none; border: 1px solid #1B318F; }
      .primary { background: #1B318F; color: #FBEBBF; }
      .secondary { background: transparent; color: #1B318F; }
    </style>
  </head>
  <body>
    <main class="card">
      <img src="/brand/icone.png" alt="" width="96" height="96" />
      <h1>Esta página não carregou</h1>
      <p>Houve uma falha do nosso lado. Tente de novo em instantes ou volte para a capa.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar de novo</button>
        <a class="secondary" href="/">Voltar para a capa</a>
      </div>
    </main>
  </body>
</html>`;
}
