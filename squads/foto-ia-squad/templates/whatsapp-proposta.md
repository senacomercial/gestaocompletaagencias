# Template: Proposta Comercial

**Agente:** vendedor-ia
**Gatilho:** Lead qualificado (status: EM_QUALIFICACAO → PROPOSTA_ENVIADA)

---

## Mensagem

```
Perfeito, {{leadNome}}! 🎯

Para *{{tipoFotoLabel}}* temos uma proposta especial:

✅ *{{quantidadeImagens}} fotos profissionais* geradas por IA
✅ Entrega em até *1 hora* após confirmação do pedido
✅ Qualidade de estúdio fotográfico
✅ *{{maxRevisoes}} rodadas de ajuste* inclusas

💰 *Investimento: R$ {{valorFormatado}}*
(pagamento único via PIX, cartão ou boleto)

Veja alguns exemplos do nosso portfólio:
👉 {{linkPortfolio}}

O que acha? Posso gerar o link de pagamento agora mesmo para você garantir! 😊
```

---

## Variáveis
- `{{leadNome}}` — primeiro nome do lead
- `{{tipoFotoLabel}}` — ex: "Retrato Profissional"
- `{{quantidadeImagens}}` — ex: 5
- `{{maxRevisoes}}` — ex: 2
- `{{valorFormatado}}` — ex: R$ 97,00
- `{{linkPortfolio}}` — link para exemplos do portfólio
