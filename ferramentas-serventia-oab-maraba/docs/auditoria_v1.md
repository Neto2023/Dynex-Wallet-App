# Auditoria do projeto Ferramentas da Serventia, v1

**Objeto:** `ferramentas-serventia-oab-maraba/`, commit `5477a2b`, branch `claude/ferramentas-serventia-oab-duv8qx`, PR #1 (rascunho)
**Data:** 25/11/2026
**Natureza:** auditoria somente de leitura. Nenhum arquivo do projeto foi alterado.

## 1. Método

| Frente | Ferramenta | Resultado |
|---|---|---|
| Correção do código | skill `code-review` (nível alto), sobre `main...HEAD` | 10 achados: 4 importantes e 6 menores. Os 46 testes passam e o build reproduz `dist/` byte a byte |
| Segurança | skill `security-review`, com varredura e filtro de falso positivo em subagentes separados | Nenhuma vulnerabilidade acima do corte da skill (confiança 8 de 10). Um achado de endurecimento com confiança 6 |
| Acessibilidade | skill `design:accessibility-review` (WCAG 2.1 AA), com cálculo de contraste e varredura no Playwright | 11 achados: 3 maiores e 8 menores |
| Conformidade normativa | agente `conferidor-normativo` (plugin PROFNIT) | **Não concluída.** A rede da sessão bloqueia planalto.gov.br, tjpa.jus.br e cnj.jus.br. Nada foi dado como conferido |
| Aderência à instrução e governança | leitura direta contra a instrução de 25/11/2026 | 8 achados |

Escala de severidade: **Crítico** (impede a apresentação ao Fórum), **Alto** (contraria regra da instrução ou produz resultado errado), **Médio** (falha com impacto limitado), **Baixo** (melhoria).

## 2. Resumo

O núcleo está correto e coberto por teste:
- regra de ordenação sem pesos;
- prazos do art. 228;
- distribuição 41/41/42;
- bloqueio das vedações;
- fecho do ato;
- funcionamento sem rede.

Os problemas que importam estão em três frentes:

1. **Fluxo da interface.** A marcação "Lido individualmente" sobrevive à troca de inciso e à geração do lote. Isso permite gerar atos de um inciso para processos lidos para outro, contra o fluxo BERNA que a ferramenta promete seguir. É o achado mais grave.
2. **Fonte normativa ainda não conferida.** Nenhuma citação foi conferida na fonte oficial: CPC, provimentos, PP do CNJ, FAQ BERNA e leis de feriados.
3. **Governança do repositório.** O projeto da OAB está dentro de um repositório de carteira de criptomoeda, sob a licença MIT de terceiro ("Copyright (c) 2022 TuringX"), e os commits têm autoria genérica.

| Severidade | Código | Segurança | Acessibilidade | Normativo | Governança | Total |
|---|---|---|---|---|---|---|
| Crítico | 1 | 0 | 0 | 1 | 1 | 3 |
| Alto | 3 | 0 | 3 | 1 | 2 | 9 |
| Médio | 2 | 1 | 3 | 1 | 3 | 10 |
| Baixo | 4 | 1 | 5 | 0 | 2 | 12 |

## 3. Achados

### 3.1 Código (skill code-review)

| ID | Sev. | Local | Achado | Cenário de falha |
|---|---|---|---|---|
| C-01 | Crítico | `src/atos-lote/ui.js:352` e `:242` | A marcação "Lido" não é zerada ao trocar de inciso nem depois de gerar o lote | O servidor lê 10 processos para o inciso XV e gera o lote. Depois troca para o III, que tem modelo validado: o botão já está habilitado e gera 10 atos do III para processos que ninguém leu para esse inciso. Clicar de novo em Gerar repete o lote |
| C-02 | Alto | `src/distribuidor/ui.js:330`, `:337` | Perfil de mapeamento que aponta para coluna inexistente cai, sem aviso, na coluna 1 (número do processo) | A tabela nova tem menos colunas. Etiquetas recebem o próprio número CNJ e a data lê a coluna errada |
| C-03 | Alto | `src/distribuidor/processo.js:47` | Sugestão de preferência recusada pelo servidor volta ao reabrir a sessão | O servidor desmarca "idoso", salva e reabre: o alerta reaparece e a caixa vem marcada. Ao confirmar outra preferência, "idoso" é confirmado junto |
| C-04 | Alto | `src/distribuidor/ui.js:73` | A escolha do prazo do art. 228 na prévia volta ao padrão a cada redesenho da tela | O servidor escolhe "1 dia", edita outro processo e aceita a prévia: todos entram com "5 dias" e os alertas de 1 dia nunca disparam |
| C-05 | Médio | `src/comum/parser.js:214` | Sugestão automática de coluna confunde "Nome da parte" com número do processo (`n[ºo°]` casa "no") | Todas as linhas viram "sem número" |
| C-06 | Médio | `src/distribuidor/ui.js:596` | Feriado em dd/mm/aaaa num perfil editado à mão é aceito, mas não é contado | O dia 20/11 conta como útil e o alerta sai um dia antes |
| C-07 | Baixo | `src/distribuidor/ui.js:484` | Salvar a edição zera os segundos da data de entrada | Dois processos do mesmo minuto trocam de posição |
| C-08 | Baixo | `src/distribuidor/painel.js:48` | A coluna "Ordem" do CSV da fila do servidor difere da impressão | O CSV mostra 1, 1, 3, 2 e a impressão mostra 1, 2, 3, 4 |
| C-09 | Baixo | `src/atos-lote/ui.js:265`, `:273`, `:377` | A falha de cópia aparece no estilo verde de sucesso | O servidor cola no PJe um conteúdo antigo da área de transferência |
| C-10 | Baixo | `build.mjs:78` | O build verifica a regra de não sobrescrever arquivo por arquivo, já dentro do laço de gravação | `dist/` fica com versões misturadas |

### 3.2 Segurança (skill security-review)

Verificações sem achado:
- não há `innerHTML`, `eval` nem `document.write`, e toda renderização usa nós de texto;
- a regra de bloqueio de rede (CSP) está correta;
- o `localStorage` guarda só preferências de interface;
- a máscara de sigilo é aplicada no CSV e na impressão;
- o build não interpreta padrões especiais de substituição.

| ID | Sev. | Local | Achado | Observação |
|---|---|---|---|---|
| S-01 | Médio | `src/comum/exporta.js:3-14` | **Injeção de fórmula em CSV.** Célula que começa com `=`, `+`, `-` ou `@` vai crua para o CSV, que foi feito para abrir direto no Excel. Valores vindos de `.json` compartilhado (título do modelo, "validado por", registros de auditoria, tarefa) chegam às exportações | Confiança 6 de 10, abaixo do corte da skill. Exige engenharia social, e o Excel moderno alerta em DDE. Correção barata: prefixar `'` |
| S-02 | Baixo | `src/atos-lote/modelos.js:13-21` | A "impressão digital" FNV do modelo validado pode ser recalculada por quem edita o `.json`. A validação no próprio programa também é autodeclarada (nome livre) | Não é falha nova: o README já diz que não é assinatura. Falta avisar na tela que "validado pelo juízo" num arquivo importado depende da origem do arquivo |

Fora do escopo da skill, mas relevante para a vara: o arquivo de sessão `.json` guarda números completos, inclusive de processos sigilosos, e o navegador o salva em "Downloads" de um computador compartilhado. Isso é orientação de uso: salvar na pasta da vara e apagar de Downloads.

### 3.3 Acessibilidade (skill design:accessibility-review, WCAG 2.1 AA)

| ID | Sev. | Critério | Achado | Recomendação |
|---|---|---|---|---|
| A-01 | Alto | 1.4.10 Reflow | O Gerador de Atos estoura 113 px na horizontal a 320 px de largura. O Distribuidor não estoura | Quebrar a tabela de processos e a lista de incisos em telas estreitas |
| A-02 | Alto | 1.4.11 Contraste não textual | A borda de campos e botões discretos (`#C9D6E2` sobre branco) tem 1,48:1; o mínimo é 3:1 | Borda de pelo menos `#8A99A8` |
| A-03 | Alto | 1.4.3 Contraste | O texto dos incisos desabilitados (`#7A8796`) tem 3,66:1 sobre branco e 3,27:1 sobre zebra. Eles continuam clicáveis para leitura, então precisam de 4,5:1 | `#5E6B7A` ou mais escuro |
| A-04 | Médio | 3.3.2 / 4.1.2 | As áreas de colar (`#txt-colar`, `#txt-tabela`, `#txt-processos`) têm só placeholder, sem rótulo | Rótulo visível ou `aria-label` |
| A-05 | Médio | 4.1.2 / 2.1.1 | As abas usam `role="tab"` sem `aria-controls`, sem `role="tabpanel"` e sem navegação por setas | Completar o padrão ARIA de abas ou trocar por botões com `aria-pressed` |
| A-06 | Médio | 3.3.1 | Erros do diálogo de edição e de configuração aparecem numa caixa que não recebe foco nem é anunciada. O aviso de erro some em 7 s | `role="alert"`, foco na caixa de erros, `aria-invalid` no campo |
| A-07 | Baixo | 2.4.6 / 4.1.2 | Botões repetidos sem contexto: "Tirar", "Remover", "Copiar" | `aria-label` com o número do processo ou o nome do servidor |
| A-08 | Baixo | 4.1.2 | Linha da tabela clicável (`tr` com `tabindex`) não é anunciada como ação | Botão "Editar" explícito em cada linha |
| A-09 | Baixo | 2.5.8 (WCAG 2.2) | 8 alvos menores que 24 px (A-, A+ e caixas de seleção) | Área mínima de 24 x 24 |
| A-10 | Baixo | 2.4.1 | Sem link "pular para o conteúdo" (os marcos `header`, `main` e `footer` existem) | Opcional |
| A-11 | Baixo | Navegação | Os 28 incisos são 28 paradas de Tab | Grupo de rádio com setas |

Contraste aprovado: corpo 17,2:1; texto secundário 7,6:1; cabeçalho de tabela e botões 5,5:1; vermelho de alerta 5,3:1 (4,7:1 sobre zebra); selo de revisão 5,3:1.

### 3.4 Conformidade normativa (agente conferidor-normativo)

| ID | Sev. | Achado |
|---|---|---|
| N-01 | Crítico | **Nenhuma das 15 afirmações normativas foi conferida na fonte oficial**: CPC arts. 12, 153, 228, 1.048 e 203, § 4º; Provimentos 006/2006-CJRMB e 006/2009-CJCI; 28 incisos e 7 vedações; PP CNJ 0005150-49.2024.2.00.0000; FAQ BERNA; leis de feriados. Motivo: bloqueio de rede da sessão. Ficam como "não verificável" |
| N-02 | Alto | **PP do CNJ:** a busca só localizou uma cópia em site de terceiro (Migalhas), não a fonte oficial. O trecho indexado sugere pedido para o CNJ criar ferramenta de pesos, julgado improcedente. Isso é coerente com a premissa do software, mas não foi lido |
| N-03 | Médio | **Feriados:** a remissão "Lei 662/1949" pode precisar de "com a redação da Lei 10.607/2002". Também é preciso decidir como tratar a Sexta-feira da Paixão (Lei 9.093/1995). Ambos os pontos não foram conferidos |

Para destravar: liberar `www.planalto.gov.br`, `www.tjpa.jus.br`, `www.cnj.jus.br` e `atos.cnj.jus.br` na rede do ambiente, ou entregar os PDFs numa pasta local.

### 3.5 Aderência à instrução e governança

| ID | Sev. | Achado |
|---|---|---|
| G-01 | Crítico | **Repositório e licença.** O projeto está em `Neto2023/Dynex-Wallet-App`, repositório de carteira de criptomoeda cuja raiz tem `LICENSE.md` MIT com "Copyright (c) 2022 TuringX". Um protótipo institucional da OAB apresentado ao Fórum não pode ter titularidade e licença ambíguas nem morar em repositório sem relação. A instrução manda não criar repositório sem indicação do Dr. Abrahão: decisão pendente |
| G-02 | Alto | **Titularidade e autoria.** O código foi escrito com assistência de IA, para a OAB/PA Subseção Marabá. Falta definir o titular (Subseção, Seccional ou pessoa física), a licença e o registro de autoria humana (Lei 9.609/1998, art. 4º) |
| G-03 | Alto | **O teste E2E sobrescreve as capturas entregues.** `test/e2e/offline.e2e.mjs` regrava `docs/screenshots/*_v1.png` a cada execução, contra a regra de nunca sobrescrever arquivo entregue |
| G-04 | Médio | **Autoria dos commits.** O commit está como `Claude <noreply@anthropic.com>`. Para rastreabilidade institucional, o autor deve ser o responsável humano, mantendo a coautoria da IA |
| G-05 | Médio | **Sem integração contínua.** O PR não tem verificação automática: os testes e o E2E só rodam à mão |
| G-06 | Médio | **Uso da marca.** O logotipo da OAB Pará vai embutido nos HTML. Confirmar se a Subseção pode usá-lo em protótipo apresentado a outro órgão |
| G-07 | Baixo | **Painel da regra.** O painel "Regra de ordenação" fica no topo e sai da tela ao rolar. A instrução diz "sempre visível" |
| G-08 | Baixo | **Esboços.** `esboco_t1.png` e `esboco_t2.png` não chegaram: a comparação visual do item 7.5 está pendente |

## 4. O que está conforme

- **Regra de ordenação** (4.4): sem pesos, com teste de código e de comportamento.
- **Distribuição** 41/41/42 e ajuste do fator (4.7).
- **Prazos do art. 228** nos dois modos de contagem (4.5).
- **Máscara de sigiloso** no CSV e na impressão.
- **Ferramenta II:**
  - catálogo com 28 incisos;
  - rascunho não gera lote;
  - processo não lido fica fora do lote, mas veja C-01 quanto à persistência da marca;
  - fecho obrigatório;
  - vedações bloqueadas;
  - modelo validado alterado volta a rascunho.
- **Funcionamento** via `file://` sem rede, nenhum travessão em `dist/` e `localStorage` só com preferências.
- **Pendências `[PENDENTE]`** registradas na tela e no README, sem suposição.

## 5. Limites desta auditoria

- **Fontes oficiais:** não foram lidas (bloqueio de rede).
- **Acessibilidade:** a varredura é automática; faltam teste com leitor de tela (NVDA) e teste com servidores reais.
- **Segurança:** segue o recorte da skill (alta confiança). O endurecimento S-01 foi incluído por decisão desta auditoria.
