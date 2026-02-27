# Template: Entrega Final

**Agente:** entregador-ia
**Gatilho:** Cliente aprova as fotos (status: ENTREGUE)

---

## Mensagem

```
🥳 *Que ótima notícia!* Fico feliz que tenha gostado, {{leadNome}}!

Seus arquivos em *alta resolução* estão disponíveis para download:

📥 *Download das fotos:*
👉 {{linkDownload}}

(Disponível por 30 dias)

---
*Resumo do seu pedido:*
📸 {{quantidadeImagens}} fotos de {{tipoFotoLabel}}
⏱️ Entregue em {{duracaoTotal}}
⭐ Obrigado pela confiança!

Se precisar de mais fotos no futuro, é só me chamar! 😊
*Equipe FotoIA*
```

---

## Variáveis
- `{{leadNome}}` — nome do cliente
- `{{linkDownload}}` — link para download em alta resolução
- `{{quantidadeImagens}}` — número de fotos
- `{{tipoFotoLabel}}` — tipo de foto
- `{{duracaoTotal}}` — ex: "42 minutos"
