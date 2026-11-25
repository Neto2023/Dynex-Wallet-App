# Planejamento: Ferramentas da Serventia, da v1 auditada à v2 para o Fórum

**Base:** `docs/auditoria_v1.md` (25/11/2026)
**Meta:** entregar a v2 (`dist/*_v2.html`) apta a ser apresentada à Diretoria do Fórum e ao juízo da 1ª Vara Cível e Empresarial de Marabá. A v1 fica preservada.

## 1. Regras do trabalho

1. **Arquivos entregues.** A v1 não é editada nem sobrescrita. A v2 sai com `VERSAO = 'v2'` em `build.mjs` e gera arquivos novos. Documentos alterados ganham nova versão (`_v2`, `_v3`).
2. **Teste antes da correção.** Cada correção de código começa por um teste que reproduz o achado e falha, e termina com ele passando.
3. **Portões de auditoria.** Ao fim das Fases 2 e 3, as skills de auditoria rodam de novo, como portão:
   - `code-review` (nível alto);
   - `security-review`;
   - `design:accessibility-review`.

   A v2 só vai ao Fórum com zero achado Crítico ou Alto aberto.
4. **Norma só com fonte lida.** Nenhuma citação normativa é dada como conferida sem fonte oficial lida pelo agente `conferidor-normativo`. Depois, o agente `auditor-de-citacoes` revisa os textos "Sobre" e o README.
5. **Sem suposição nas pendências.** Pendência que depende de terceiro continua `[PENDENTE]`. Não se resolve por suposição.

## 2. Fases

### Fase 0: decisões e insumos (Dr. Abrahão)

Estas decisões vêm antes de qualquer código, porque mudam onde e sob qual titularidade o trabalho fica.

| # | Decisão ou insumo | Achado | Por que agora |
|---|---|---|---|
| 0.1 | **Repositório definitivo.** Repositório próprio da Subseção, ou do Dr. Abrahão, com nome institucional | G-01 | Tirar o projeto do repositório Dynex, que tem licença MIT de terceiro. O PR #1 vira referência histórica e é fechado depois da migração |
| 0.2 | **Titular e licença** do software (Subseção, Seccional ou pessoa física), com registro de autoria humana e da assistência de IA | G-02 | Rodar a skill `startup-legal-br:cadeia-de-titularidade` (ou o agente `titularidade-software`) para montar a matriz de titularidade e a cessão, se houver |
| 0.3 | **Autor dos commits** (nome e e-mail institucional), mantendo a linha de coautoria da IA | G-04 | Rastreabilidade perante o Fórum |
| 0.4 | **Uso do logotipo** da OAB Pará no protótipo | G-06 | Confirmar com a Presidência da Subseção |
| 0.5 | **Acesso às fontes normativas.** Liberar na rede do ambiente `www.planalto.gov.br`, `www.tjpa.jus.br`, `www.cnj.jus.br` e `atos.cnj.jus.br`, ou entregar os PDFs (CPC, Provimentos 006/2006 e 006/2009, decisão do PP CNJ, FAQ BERNA, Leis 662/1949, 10.607/2002, 6.802/1980, 9.093/1995 e 14.759/2023) | N-01 a N-03 | Destrava a Fase 3 |
| 0.6 | **Esboços** `esboco_t1.png` e `esboco_t2.png` | G-08 | Comparação visual |

### Fase 1: correções críticas e altas de código e segurança

| # | Tarefa | Achado | Critério de pronto |
|---|---|---|---|
| 1.1 | Guardar "Lido" por inciso e zerar a marcação depois de cada lote gerado. Pedir confirmação ao trocar de inciso com processos marcados | C-01 | Teste: trocar de inciso deixa 0 lidos, e gerar duas vezes seguidas sem nova leitura é impossível |
| 1.2 | Mapeamento: índice inexistente vira "(não usar)" com aviso, e `''` é tratado como -1 | C-02 | Teste com perfil de 6 colunas aplicado a tabela de 4 |
| 1.3 | Sugestão de preferência só preenche `preferencias` na criação pelo parser, não ao reabrir sessão. Gravar a marca "sugestão revisada" | C-03 | Teste: recusar, salvar, reabrir: a sugestão não volta |
| 1.4 | Prévia: só repor o tipo de prazo ao trocar de módulo | C-04 | Teste E2E: escolher "1 dia", editar outro processo e aceitar: entra "1 dia" |
| 1.5 | CSV: prefixar `'` em célula que comece com `= + - @`, tabulação ou CR | S-01 | Teste unitário de `celulaCSV` |
| 1.6 | E2E: gravar capturas em `docs/screenshots/<versão>/` e recusar sobrescrever pasta existente | G-03 | Rodar o E2E duas vezes não altera a captura entregue |
| 1.7 | Build: verificar todas as saídas antes de gravar qualquer arquivo | C-10 | Teste de `construir()` com um arquivo já presente |

### Fase 2: acessibilidade e correções médias e baixas

| # | Tarefa | Achado |
|---|---|---|
| 2.1 | Reflow a 320 px no Gerador de Atos (tabela de processos e lista de incisos) | A-01 |
| 2.2 | Borda de campos e botões com pelo menos 3:1 (`#8A99A8`) e texto de inciso desabilitado com pelo menos 4,5:1 (`#5E6B7A`) | A-02, A-03 |
| 2.3 | Rótulos nas áreas de colar; padrão ARIA completo de abas com setas; erros com `role="alert"`, foco e `aria-invalid` | A-04 a A-06 |
| 2.4 | `aria-label` contextual em Tirar, Remover e Copiar; botão Editar por linha; alvos de 24 px; link "pular para o conteúdo"; incisos como grupo de rádio | A-07 a A-11 |
| 2.5 | Parser: regex do cabeçalho "Nº"; perfil com datas em dd/mm/aaaa normalizadas para ISO; manter os segundos ao editar; ordem da fila igual no CSV e na impressão; aviso vermelho quando a cópia falhar | C-05 a C-09 |
| 2.6 | Painel "Regra de ordenação" fixo (sticky) ou repetido sobre a tabela | G-07 |
| 2.7 | Aviso na tela: "validado pelo juízo" em arquivo importado depende da origem do arquivo. Orientação para guardar o `.json` de sessão na pasta da vara e apagar de Downloads | S-02 |
| 2.8 | **Portão:** `code-review`, `security-review` e `design:accessibility-review` de novo, mais um teste manual com NVDA em um computador Windows da vara | todos |

### Fase 3: conferência normativa e conteúdo jurídico

| # | Tarefa | Agente ou skill |
|---|---|---|
| 3.1 | Conferir CPC arts. 12, 153, 228, 1.048 e 203, § 4º, no Planalto, com transcrição literal e data | `conferidor-normativo` |
| 3.2 | Conferir os 28 incisos e as 7 vedações contra o PDF oficial do Provimento 006/2006-CJRMB. Verificar a vigência dele e do 006/2009-CJCI (revogação ou consolidação em código de normas) | `conferidor-normativo` |
| 3.3 | Localizar a decisão do PP CNJ 0005150-49.2024.2.00.0000 em fonte do CNJ e confirmar a tese usada no software | `conferidor-normativo` |
| 3.4 | Conferir o FAQ BERNA (SETIC/TJPA) | `conferidor-normativo` |
| 3.5 | Corrigir a remissão dos feriados (Lei 10.607/2002) e decidir sobre a Sexta-feira da Paixão. Marcar `CONFERENCIA_CATALOGO.conferido = true` só com a errata aplicada | código + `conferidor-normativo` |
| 3.6 | Rever os textos "Sobre" e o README contra as fontes lidas | `auditor-de-citacoes` |
| 3.7 | **Portão:** sem divergência aberta entre software e fonte | `conferidor-normativo` e `auditor-de-citacoes` |

### Fase 4: dados reais e validação com a vara

Depende de terceiros: Direção de Secretaria e juízo.

| # | Tarefa | Depende de |
|---|---|---|
| 4.1 | Receber a amostra anonimizada da cópia do painel. Ajustar o parser e criar fixture fictícia no mesmo formato. Nunca versionar a amostra real | Direção de Secretaria |
| 4.2 | Confirmar qual data o painel exibe; ajustar o marco do art. 228 e a frase de aviso | Direção de Secretaria |
| 4.3 | Decisão do juízo sobre dias úteis ou corridos; carregar o calendário forense do TJPA no perfil da vara | Juízo |
| 4.4 | Validação dos modelos de ato e dos prazos atualizados ao CPC de 2015; decisão sobre os incisos marcados para revisão (XVI e XXIV a XXVIII) | Juízo |
| 4.5 | Sessão de teste de uso com 2 ou 3 servidores (Secretaria e Gabinete), com roteiro e registro de problemas | Vara |

### Fase 5: entrega da v2

| # | Tarefa |
|---|---|
| 5.1 | `VERSAO = 'v2'` e build de `dist/distribuidor-tarefas_v2.html` e `dist/atos-em-lote_v2.html`, ao lado da v1 |
| 5.2 | Integração contínua no repositório definitivo: testes de lógica e E2E offline a cada PR (G-05) |
| 5.3 | Capturas da v2 em `docs/screenshots/v2/` e comparação com os esboços |
| 5.4 | Guia de uso de uma página por ferramenta, para o servidor |
| 5.5 | Checklist de aceite (seções 4.10 e 5.8 da instrução) assinado, mais o relatório final dos três portões |
| 5.6 | Ofício de encaminhamento à Diretoria do Fórum, com a identidade da Presidência (skill `visual-law-oab-maraba`), só quando o Dr. Abrahão pedir |

## 3. Ordem e dependências

```
Fase 0 (decisões) ──► migração do repositório ──► Fase 1 ──► Fase 2 ──► portão 2.8 ──┐
       │                                                                              ├──► Fase 5
       └──► 0.5 acesso às fontes ──► Fase 3 ──► portão 3.7 ───────────────────────────┤
                                     Fase 4 (terceiros, em paralelo) ─────────────────┘
```

- **Paralelismo.** As Fases 1 e 2 não dependem das Fases 3 e 4 e podem começar assim que o repositório for definido (0.1). Se o Dr. Abrahão preferir, as Fases 1 e 2 podem começar neste branch e migrar depois.
- **Caminho crítico até o Fórum:** 0.1, 0.5, 1.1 e Fase 3. A Fase 4 pode seguir depois da apresentação, porque o protótipo funciona com dados fictícios e com as pendências declaradas.

## 4. Riscos

| Risco | Efeito | Mitigação |
|---|---|---|
| Texto do provimento divergir do OCR | Ato com fundamento errado | Fase 3.2 antes do Fórum. O catálogo segue marcado como não conferido até lá |
| Provimento revogado ou consolidado | A Ferramenta II perde a base normativa | Fase 3.2 verifica a vigência. Se houver código de normas, refazer o catálogo |
| Formato real do painel muito diferente | Parser não reconhece | A entrada por tabela com mapeamento já cobre esse caso; 4.1 ajusta o texto livre |
| Arquivo de sessão esquecido em Downloads | Exposição de números de processo | 2.7, orientação na tela e no guia |
| Modelo "validado" forjado em `.json` | Lote com modelo não validado | Vedações continuam bloqueadas. Aviso 2.7 e validação sempre feita na própria vara |

## 5. Pendências que seguem com terceiros

Continuam as da seção 8 da instrução:
- amostra do painel;
- data exibida no painel;
- contagem dos prazos;
- conferência dos incisos;
- validação dos modelos;
- aplicabilidade dos incisos marcados para revisão.

Esta auditoria acrescenta:
- repositório, titularidade e licença (0.1 e 0.2);
- uso da marca (0.4);
- acesso às fontes oficiais (0.5).
