# Template: Galeria Pronta para Aprovação

**Agente:** entregador-ia
**Gatilho:** Imagens geradas (status: EM_PRODUCAO → AGUARDANDO_APROVACAO)

---

## Mensagem

```
🎉 *Suas fotos ficaram incríveis, {{leadNome}}!*

Acesse a galeria para visualizar todas as {{quantidadeImagens}} fotos:

📸 *Ver minha galeria:*
👉 {{linkGaleria}}

(Link válido por 72 horas)

---
Para *aprovar* e receber os arquivos em alta resolução, responda:
✅ *"Aprovado"* ou *"Gostei"*

Para solicitar *ajustes*, responda:
✏️ *"Quero ajustar"* + descreva o que mudar

Você tem direito a *{{revisoesRestantes}} rodada(s) de ajuste* inclusa(s). 😊
```

---

## Variáveis
- `{{leadNome}}` — nome do cliente
- `{{quantidadeImagens}}` — número de fotos geradas
- `{{linkGaleria}}` — URL pública da galeria
- `{{revisoesRestantes}}` — quantas revisões ainda tem
