# Planejamento v3: Ferramentas da Serventia

**Base:** `docs/plano_v2.md` (preservado) e `docs/auditoria_v1.md`
**Data:** 25/11/2026
**O que muda em relação ao v2:** duas regras novas para evitar retrabalho, as decisões tomadas pelo Dr. Abrahão e a auditoria prévia das Fases 1 e 2.

## 1. Regras novas

1. **Texto jurídico só depois da conferência das normas.** Catálogo do provimento, textos "Sobre", fecho do ato e feriados só mudam depois que o agente `conferidor-normativo` ler a fonte oficial. As Fases 1 e 2 não tocam nesses textos.
2. **Auditoria antes de codar, não só depois.** Antes de cada fase, o plano daquela fase é conferido contra a instrução de 25/11/2026. No fim da fase, rodam as skills `code-review`, `security-review` e `design:accessibility-review`.

As regras do v2 continuam valendo:
- v1 preservada;
- arquivos novos a cada versão;
- teste antes da correção;
- nenhuma pendência resolvida por suposição.

## 2. Decisões do Dr. Abrahão (25/11/2026)

| Tema | Decisão |
|---|---|
| Repositório | O projeto continua no branch atual. Muda para o repositório definitivo só no fim |
| Correções | Executar as Fases 1 e 2 já |
| Fontes normativas | Liberados na rede do ambiente: www.planalto.gov.br, www.tjpa.jus.br, www.cnj.jus.br e atos.cnj.jus.br. A conferência (Fase 3) está em andamento |
| Autoria | **Autoria pessoal:** Dr. Abrahão, Presidente da Comissão de Direito Digital da OAB/PA Subseção Marabá. **Responsabilidade institucional:** OAB Subseção Marabá. Registrar já em `AUTORIA.md`, com licença "Todos os direitos reservados". O termo de cessão fica `[PENDENTE]` |

## 3. Auditoria prévia das Fases 1 e 2 contra a instrução

| Tarefa | Dispositivo da instrução | Conclusão |
|---|---|---|
| 1.1 "Lido" passa a valer por inciso e é zerado depois do lote | 5.6, item 2 ("caixa obrigatória 'Lido individualmente'", "não marcado fica fora do lote"); 5.2 (FAQ BERNA: leitura um a um) | **Conforme e necessário.** A leitura vale para a hipótese e para a etiqueta daquele inciso. A sessão da v1 não guarda o inciso de cada leitura, então as marcações dela são descartadas ao abrir, com aviso |
| 1.2 Mapeamento sem coluna inexistente | 3.2 ("nenhuma inferência silenciosa") | Conforme |
| 1.3 Sugestão recusada não volta | 3.2 e 4.3 (`preferenciaConfirmada`: sugestão só vale confirmada) | Conforme. Novo campo `sugestoesRevisadas` |
| 1.4 Prazo da prévia não volta ao padrão | 4.5 | Conforme |
| 1.5 CSV contra fórmulas | 4.9 e 5.6 (exportação CSV) | Conforme. Só afeta célula que começa com `= + - @`; número de processo e datas não mudam |
| 1.6 Capturas por versão, sem sobrescrever | 0.6 ("nunca sobrescrever arquivo entregue") e 7.5 | Conforme |
| 1.7 Build verifica tudo antes de gravar | 0.6 | Conforme |
| 2.1 a 2.4 Acessibilidade (reflow, contraste, rótulos, abas, erros) | 2 (paleta OAB) | Conforme. Cinzas de borda e de texto desabilitado não fazem parte da paleta institucional. Navy, azul e vermelho continuam iguais |
| 2.5 Correções menores | 3.2, 4.9 | Conforme |
| 2.6 Painel da regra fixo | 4.9 ("sempre visível") | Conforme |
| 2.7 Avisos sobre arquivo importado e sessão | 0.2 e 0.3 | Conforme. É texto de interface, não texto jurídico |
| Crédito e autoria na v2 | 6 (crédito literal: "Protótipo desenvolvido pela OAB/PA Subseção Marabá. Versão v1, novembro de 2026.") | **Ajuste decidido pelo Dr. Abrahão.** A frase institucional fica literal, só com a versão atualizada, e ganha uma linha de autoria pessoal |
| Fora das Fases 1 e 2 | Catálogo, "Sobre" jurídico, fecho, feriados | Não mexer até a Fase 3 (regra 1) |

**Resultado:** nenhuma tarefa das Fases 1 e 2 contraria a instrução. A única alteração de texto institucional (crédito) foi decidida pelo Dr. Abrahão.

## 4. Sequência

```
Fase 1 (código, teste antes) ──► Fase 2 (acessibilidade e menores) ──► portão: code-review, security-review, accessibility-review
                                                                                    │
Fase 3 (conferência em andamento) ──► errata para o Dr. Abrahão aprovar ──► texto jurídico ──► portão: auditor-de-citacoes
                                                                                    │
Fase 4 (terceiros) e Fase 5 (v2 em arquivos novos e migração de repositório) ◄──────┘
```

Até a migração, a v2 é gerada como `dist/*_v2.html`, ao lado da v1, que fica intocada.
