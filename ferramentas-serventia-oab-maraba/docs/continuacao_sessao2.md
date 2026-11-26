# Continuação do projeto: Ferramentas da Serventia (sessão 2)

**Para quem:** a próxima sessão do Claude Code, que vai rodar no computador do Dr. Abrahão, com acesso à pasta local onde estão os PDFs das normas.
**Data deste resumo:** 26/11/2026
**Projeto:** protótipos da OAB/PA Subseção Marabá para as serventias da Comarca de Marabá (TJPA)
- Ferramenta I: Distribuidor de Tarefas da Serventia
- Ferramenta II: Gerador de Atos Ordinatórios em Lote

---

## 1. Onde está o código

| Item | Valor |
|---|---|
| Repositório (provisório) | `Neto2023/Dynex-Wallet-App` (escolhido só para abrir a sessão pelo celular; o projeto será migrado no fim) |
| Branch | `claude/ferramentas-serventia-oab-duv8qx` |
| Pasta do projeto | `ferramentas-serventia-oab-maraba/` |
| Pull request | #1, em rascunho: https://github.com/Neto2023/Dynex-Wallet-App/pull/1 |
| Último commit | `34c6a09`: v2 (Fases 1 e 2), mais este documento |

Para obter o projeto no computador:

```
git clone https://github.com/Neto2023/Dynex-Wallet-App.git
cd Dynex-Wallet-App
git checkout claude/ferramentas-serventia-oab-duv8qx
cd ferramentas-serventia-oab-maraba
npm test                    # 57 testes de lógica (Node 20 ou superior, sem dependências)
```

## 2. O que já foi criado

| Arquivo ou pasta | O que é |
|---|---|
| `dist/distribuidor-tarefas_v1.html` e `dist/atos-em-lote_v1.html` | v1 entregue. **Não editar nem sobrescrever** |
| `dist/distribuidor-tarefas_v2.html` e `dist/atos-em-lote_v2.html` | v2: correções da auditoria e acessibilidade. Texto jurídico ainda **não conferido** |
| `src/` | Código-fonte (comum, distribuidor, atos-lote). O build junta tudo num HTML por ferramenta |
| `build.mjs` | Build sem dependências. Constante `VERSAO` (hoje `v2`). Recusa sobrescrever arquivo existente em `dist/` |
| `test/*.test.mjs` | Testes de lógica (`npm test`) |
| `test/e2e/offline.e2e.mjs` | Teste no navegador, offline, via `file://` (`npm run e2e`, requer Playwright) |
| `test/fixtures/` | Somente dados fictícios |
| `docs/auditoria_v1.md` | Auditoria da v1: código, segurança, acessibilidade, normas e governança |
| `docs/plano_v2.md` e `docs/plano_v3.md` | Planejamento. **O v3 é o vigente** |
| `docs/screenshots/` | Capturas da v1 (raiz) e da v2 (`v2/`) |
| `AUTORIA.md` e `LICENSE` | Autoria e licença (todos os direitos reservados) |
| `README.md` | Uso, pendências e critérios de aceite. Ainda descreve a v1; atualizar ao fechar a v3 |

## 3. Decisões do Dr. Abrahão

1. **Repositório.** Continuar no branch atual e migrar para um repositório próprio só no fim.
2. **Autoria.** Autoria pessoal: Dr. Abrahão, Presidente da Comissão de Direito Digital da OAB/PA Subseção Marabá. Responsabilidade institucional: OAB/PA Subseção Marabá. Licença "Todos os direitos reservados".
   - `[PENDENTE]` nome completo;
   - `[PENDENTE]` termo de cessão. Conferir no Estatuto da OAB quem tem personalidade jurídica: a Seccional ou a Subseção.
3. **Fases 1 e 2 executadas.** Todos os achados críticos e altos de código e de acessibilidade foram corrigidos.
4. **Regras do plano v3:**
   - texto jurídico (catálogo, "Sobre", fecho, feriados) só muda depois da conferência das normas na fonte;
   - antes de cada fase, auditar o plano contra a instrução de 25/11/2026; no fim, rodar as skills `code-review`, `security-review` e `design:accessibility-review`.

## 4. Onde paramos: Fase 3 (conferência das normas)

A sessão 1 não conseguiu ler as fontes oficiais:
- o TJPA bloqueia acesso automático (WAF, Support ID 17931823000217416678);
- o Planalto não responde na rede da sessão em nuvem.

Do CNJ foram lidas a pauta e a notícia oficial do PP 0005150-49.2024.2.00.0000. **Número e data conferem.** A tese é compatível com a notícia, com duas ressalvas: a notícia diz que a definição cabe "essencialmente" ao juiz, e não diz "sem pesos" de forma expressa. O acórdão não foi lido.

### Pasta local com as normas

Coloque os arquivos numa pasta do computador e informe o caminho à nova sessão. Nomes sugeridos:

| Arquivo sugerido | Fonte |
|---|---|
| `prov-006-2006-CJRMB.pdf` | https://www.tjpa.jus.br/CMSPortal/VisualizarArquivo?idArquivo=3238 |
| `prov-006-2009-CJCI.pdf` | https://www.tjpa.jus.br/CMSPortal/VisualizarArquivo?idArquivo=192819 |
| `faq-etiquetas-berna.pdf` | https://www.tjpa.jus.br/CMSPortal/VisualizarArquivo?idArquivo=1694625 |
| `cpc-lei-13105.pdf` (ou .html) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm |
| `lei-662-1949.pdf` | https://www.planalto.gov.br/ccivil_03/leis/l0662.htm |
| `lei-10607-2002.pdf` | https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm |
| `lei-6802-1980.pdf` | https://www.planalto.gov.br/ccivil_03/leis/l6802.htm |
| `lei-9093-1995.pdf` | https://www.planalto.gov.br/ccivil_03/leis/l9093.htm |
| `lei-14759-2023.pdf` | https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm |
| `pp-cnj-0005150-49-2024.pdf` (opcional) | Consulta pública do PJe do CNJ, pelo número |

**Mínimo para começar:** os três primeiros (TJPA).

### O que a nova sessão deve fazer, em ordem

1. Acionar o agente `plugin-mestrado-profnit:conferidor-normativo` sobre os PDFs da pasta. Se o PDF for imagem, fazer OCR.
2. Comparar, inciso por inciso, os 28 incisos e as 7 vedações de `src/atos-lote/catalogo-prov-006-2006.js`. Pontos já suspeitos:
   - inciso VIII ("a alegação da parte ou da certidão");
   - inciso XXIV ("não-atendimento");
   - inciso XXV ("transcorrido 30 dias");
   - a sigla "CJRMB" (o TJPA pode usar "CRMB");
   - a tensão entre o inciso XVI e a vedação 4.
3. Conferir também:
   - art. 1º caput e art. 2º do 006/2006, e art. 1º do 006/2009-CJCI;
   - o FAQ BERNA;
   - CPC arts. 12, 153 (§ 3º: lista própria de urgentes e preferências), 203, § 4º, 228 e 1.048;
   - a remissão dos feriados ("Lei 662/1949, com a redação da Lei 10.607/2002"; Sexta-feira da Paixão pela Lei 9.093/1995);
   - a vigência dos provimentos (revogação ou consolidação no TJPA).
4. Montar a **errata** (inciso | texto no código | texto oficial) e **apresentar ao Dr. Abrahão antes de aplicar**.
5. Com a errata aprovada:
   - aplicar no catálogo, no "Sobre", no fecho e em `prazos.js`;
   - marcar `CONFERENCIA_CATALOGO.conferido = true` só para o que foi lido;
   - rodar `plugin-mestrado-profnit:auditor-de-citacoes` nos textos "Sobre" e no README.
6. Gerar a nova versão como **v3**: `VERSAO = 'v3'` em `build.mjs`, gerando `dist/*_v3.html` ao lado da v1 e da v2. Capturas em `docs/screenshots/v3/`.
7. Portão final:
   - `code-review`, `security-review` e `design:accessibility-review`;
   - `npm test` e `npm run e2e`.

## 5. Pendências que continuam

| Pendência | Depende de |
|---|---|
| Amostra anonimizada da cópia do painel de tarefas do PJe | Direção de Secretaria da 1ª Vara Cível |
| Qual data o painel mostra (entrada na tarefa ou outra) | Direção de Secretaria |
| Contagem do art. 228 em dias úteis ou corridos | Juízo |
| Validação dos modelos de ato e dos prazos atualizados ao CPC de 2015 | Juízo |
| Aplicabilidade dos incisos XVI e XXIV a XXVIII | Juízo |
| Esboços `esboco_t1.png` e `esboco_t2.png` para comparação visual | Dr. Abrahão |
| Nome completo para `AUTORIA.md` e `LICENSE`; termo de cessão | Dr. Abrahão |
| Uso do logotipo da OAB Pará no protótipo | Presidência da Subseção |
| Repositório definitivo e migração (fechar o PR #1 depois) | Dr. Abrahão, no fim |
| Endurecimento opcional: tratar vírgula no CSV (Excel em inglês) | Próxima versão |

## 6. Regras que a nova sessão deve seguir

- Nunca sobrescrever nem apagar arquivo entregue. Cada entrega gera versão nova (`_v3`, `_v4`). Só editar o arquivo que o Dr. Abrahão mandar.
- Texto de interface, README, documentos e commits em português e **sem travessão** (U+2014). O build recusa a saída se houver um.
- Nenhum dado sai do computador da vara: HTML autocontido, sem rede e sem dado de processo em `localStorage`.
- Dados fictícios em tudo que for versionado (`0000000-01.2026.8.14.0028`).
- Pendência `[PENDENTE]` não se resolve por suposição.
- Trabalho jurídico começa pelas skills e agentes do Dr. Abrahão:
  - `conferidor-normativo` e `auditor-de-citacoes` para normas;
  - `startup-legal-br:cadeia-de-titularidade` para autoria;
  - `identidade-institucional-br:visual-law-oab-maraba` para documentos da Subseção.

## 7. Mensagem para colar na nova sessão

> Continue o projeto Ferramentas da Serventia (OAB/PA Subseção Marabá). Leia primeiro `ferramentas-serventia-oab-maraba/docs/continuacao_sessao2.md` no branch `claude/ferramentas-serventia-oab-duv8qx` do repositório `Neto2023/Dynex-Wallet-App`, e depois `docs/plano_v3.md` e `docs/auditoria_v1.md`. Os PDFs das normas estão na pasta `<CAMINHO DA PASTA>`. Faça a Fase 3: conferência normativa com o agente conferidor-normativo, errata para minha aprovação antes de aplicar, e só então a v3.
