# Post Preview App

Interface para visualizar e aprovar posts do LinkedIn + carrosséis do Instagram antes de publicar.

## Como funciona

O n8n envia os dados do post via `POST /api/post`. A interface exibe o post completo com preview do LinkedIn, imagem og e slides do Instagram. Você aprova ou rejeita, e a app chama de volta o webhook do n8n para continuar o fluxo.

## Integração com n8n

### Enviar post para preview

Adicione um **HTTP Request** node após o `Generate post summary`, antes do `Request approval via Telegram`:

```
POST https://SEU-DOMINIO.vercel.app/api/post
Content-Type: application/json

{
  "id": "{{ $execution.id }}",
  "linkedinText": "{{ $json.text }}",
  "articleTitle": "{{ $('Keep Top 1 Article').item.json.title }}",
  "articleLink": "{{ $('Keep Top 1 Article').item.json.link }}",
  "ogImage": "{{ $('Extract og:image').item.json.ogImage }}",
  "slides": [],
  "resumeWebhookUrl": "{{ $execution.resumeUrl }}"
}
```

### Receber aprovação

A app chama `resumeWebhookUrl` com `{ approved: true/false, id: "..." }` quando você clicar no botão.

## Dev local

```bash
npm install
npm run dev
```

Acesse http://localhost:3000
