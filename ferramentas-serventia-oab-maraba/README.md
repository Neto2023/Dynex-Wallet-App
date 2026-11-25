# Ferramentas da Serventia: protótipos v1

Protótipos da **OAB/PA Subseção Marabá** para as serventias judiciais da Comarca de Marabá (TJPA), com piloto sugerido na 1ª Vara Cível e Empresarial. Origem: requerimento à Diretoria do Fórum, v4, de 25/11/2026, Anexos I e II.

| Ferramenta | Arquivo para usar | O que faz |
|---|---|---|
| I. Distribuidor de Tarefas da Serventia | `dist/distribuidor-tarefas_v1.html` | Organiza as filas da secretaria e do gabinete na ordem dos arts. 12 e 153 do CPC, sinaliza os prazos do art. 228 e distribui a carga entre os servidores |
| II. Gerador de Atos Ordinatórios em Lote | `dist/atos-em-lote_v1.html` | Gera o texto dos atos do Provimento nº 006/2006-CJRMB, art. 1º, § 2º, só para processos lidos e etiquetados, com modelo validado pelo juízo |

> **Todos os dados deste repositório são fictícios.** Números de processo do tipo `0000000-01.2026.8.14.0028`. Nenhum dado real, nem anonimizado, foi ou deve ser versionado sem autorização expressa do Dr. Abrahão.

## Como abrir

1. Baixe o arquivo `.html` da pasta `dist/`.
2. Abra com dois cliques (Chrome, Edge ou Firefox). Não precisa instalar nada nem ter internet.
3. Para guardar o trabalho, use **Salvar sessão**: o navegador baixa um `.json`. Para continuar depois, **Abrir sessão**.

Garantias técnicas de que nenhum dado sai do computador:

- cada HTML é autocontido (CSS, JS e logotipo embutidos), sem CDN e sem fonte externa;
- a página declara `Content-Security-Policy` com `connect-src 'none'` e `default-src 'none'`: o navegador bloqueia qualquer conexão de rede;
- o código não usa `fetch`, `XMLHttpRequest`, `WebSocket` nem `sendBeacon` (o build recusa a saída se aparecer);
- dados de processo **nunca** vão para o `localStorage` (o computador da vara é compartilhado). O `localStorage` guarda só preferências de interface: módulo e aba ativos, inciso escolhido e tamanho da letra;
- o teste ponta a ponta abre as duas ferramentas via `file://` com o navegador em modo offline e falha se houver qualquer requisição de rede.

## Como usar

### Ferramenta I: Distribuidor de Tarefas

1. Escolha o módulo no topo: **Secretaria** (atos ordinatórios) ou **Gabinete** (minutas).
2. **Entrada de dados**, por um de três caminhos:
   - **Colar texto**: cole a relação copiada do painel de tarefas do PJe e clique em Reconhecer;
   - **Tabela ou CSV**: cole a tabela ou importe o CSV e diga qual coluna é cada informação. O mapeamento pode ser salvo como perfil `.json` (ele guarda o nome e a posição de cada coluna);
   - **Inclusão manual**, para ajustes.
3. Confira a **prévia** (o que foi reconhecido, o que ficou sem data, o que tem mais de uma data, as linhas sem número e os repetidos) e clique em Aceitar.
4. Clique em um processo para editar: urgência reconhecida pelo juiz (exige a referência do pronunciamento), preferências (sugestões do reconhecimento só valem depois de confirmadas), ordem definida pelo juiz entre preferências concorrentes, meta do CNJ (Gabinete), sigilo, responsável e observação.
5. Cadastre os servidores (nome curto e fator de carga) e clique em **Distribuir a carga**.
6. Use as abas das listas, a **Fila por servidor**, a impressão e o CSV.

Regra de ordenação, implementada exatamente como na instrução (seção 4.4):

1. **Urgência reconhecida pelo juiz**, só por marcação manual com referência, por antiguidade;
2. **Preferências legais**, só depois de confirmadas: primeiro a ordem definida pelo juiz, quando houver; os demais por antiguidade. Processo com mais de uma preferência, ou empate de data entre preferências diferentes, recebe o alerta "Preferências concorrentes: decisão do juiz", **sem reordenar por tipo**. No Gabinete, a meta do CNJ entra nesta lista, sem peso;
3. **Lista geral**, por antiguidade.

Não existe peso, pontuação ou hierarquia entre tipos de preferência (CNJ, PP 0005150-49.2024.2.00.0000). Há teste automático que verifica isso no código e no comportamento.

Prazos do art. 228: alerta quando os dias desde a entrada passam de 1 (remessa à conclusão) ou de 5 (execução de ato). Contagem em dias úteis ou corridos, com feriados e suspensões editáveis em **Configurações** e salvos no **perfil da vara**. A ferramenta não calcula nem sugere sanção.

Sigilo: processo marcado como sigiloso sai como `Sigiloso-NN.AAAA.8.14.0028` no CSV e na impressão. Na tela da vara o número completo continua visível, com o selo SIGILOSO, porque o servidor precisa dele para localizar o processo no PJe. O arquivo de sessão `.json` guarda o número completo: é arquivo de trabalho interno da vara.

### Ferramenta II: Gerador de Atos em Lote

1. **Hipótese**: escolha o inciso. O texto do inciso, a remissão ao CPC de 1973 e as observações aparecem abaixo. As vedações do art. 1º, § 3º, ficam sempre visíveis em caixa vermelha.
2. **Processos**: crie no PJe a etiqueta própria sugerida (ex.: `LOTE XV · REVISADO`), leia cada processo, etiquete e cole a relação. Marque **Lido individualmente** em cada um. Processo não marcado fica fora do lote. Não há botão "marcar todos", de propósito.
3. **Texto**: escolha ou crie o modelo, preencha o prazo e registre a **validação pelo juízo**. Só modelo validado gera lote; o rascunho gera só a prévia, com a tarja "MODELO NÃO VALIDADO PELO JUÍZO". Qualquer alteração em texto, título ou prazo de modelo validado volta o modelo para rascunho.
4. **Gerar N atos do lote**: copie o texto único (para a operação em lote do PJe, quando o ato for idêntico), copie por processo, baixe o `.txt` e a relação `.csv`.
5. O **registro de auditoria local** guarda cada geração (data e hora, servidor, inciso, modelo, versão, processos) e vai junto no Salvar sessão. Exportável em CSV, para a revisão pelo juiz prevista no art. 2º do provimento.

Todo ato termina com o fecho obrigatório, inserido pelo gerador e não editável:

> Ato praticado com fundamento no art. 1º, § 2º, inciso {{inciso}}, do Provimento nº 006/2006-CJRMB, aplicável às Comarcas do Interior por força do Provimento nº 006/2009-CJCI, e no art. 203, § 4º, do CPC.

Bloqueios rígidos: o modelo que mencione documento da lista do art. 1º, § 3º (alvará, mandado de prisão civil, busca e apreensão, desocupação, precatória para penhora e avaliação, informações em agravo de instrumento) não pode ser validado, não gera lote e é recusado na importação. Variáveis permitidas: `{{numero}}`, `{{prazo}}`, `{{data}}`, `{{servidor}}`.

Os modelos podem ser exportados e importados em `.json` para a vara validar uma vez e reutilizar. Cada modelo validado leva uma impressão digital do conteúdo: se o `.json` for alterado fora da ferramenta, o modelo volta para rascunho na importação. (É verificação de integridade simples, não assinatura digital.)

## Pendências que dependem de terceiros

Nenhuma delas foi resolvida por suposição. O código tem o ponto de extensão e o aviso na tela.

| Pendência | De quem depende | Situação no código |
|---|---|---|
| Amostra real (anonimizada) da cópia do painel de tarefas do PJe | Direção de Secretaria da 1ª Vara Cível | Parser tolerante por linha e por bloco, com prévia antes de aceitar, mapeamento de colunas para tabela e CSV, e perfil de mapeamento salvo em `.json`. Ajustar `src/comum/parser.js` quando a amostra chegar |
| Qual data o painel exibe (entrada na tarefa, ciência, outra) | Direção de Secretaria | Usa a data de entrada na tarefa como aproximação do marco do art. 228, com a frase de aviso nas configurações e no rodapé da lista. Quando houver mais de uma data no bloco, a prévia pede a escolha |
| Contagem dos prazos do art. 228 em dias úteis ou corridos | Juízo | Configurável; padrão provisório "dias úteis", com aviso `[PENDENTE]` na tela de configurações |
| Calendário de feriados e suspensões | Vara e calendário do TJPA | Lista editável e salva no perfil. Botão que insere só os feriados nacionais de 2026 fixados em lei federal; feriados forenses, estaduais e municipais e pontos facultativos ficam a cargo da vara |
| Conferência dos 28 incisos contra o PDF oficial | Dr. Abrahão (ou conferência assistida) | Catálogo em `src/atos-lote/catalogo-prov-006-2006.js` com `CONFERENCIA_CATALOGO.conferido = false` e aviso na tela. Texto transcrito literalmente da instrução (OCR) |
| Validação dos modelos de ato e dos prazos atualizados ao CPC de 2015 | Juízo | Só o modelo de exemplo do inciso XV vem na v1, em rascunho e sem prazo. O código não converte prazo do CPC de 1973 |
| Aplicabilidade dos incisos marcados para revisão | Juízo | XVI, XXIV, XXV, XXVI, XXVII e XXVIII aparecem com o selo "Revisar aplicabilidade com o juízo" e desabilitados até existir modelo validado |
| Comparação visual com os esboços aprovados (`esboco_t1.png` e `esboco_t2.png`) | Dr. Abrahão | Os esboços não vieram anexados a esta etapa. As capturas da v1 estão em `docs/screenshots/` para comparação |

### Pontos para o Dr. Abrahão conferir

- **Inciso XVI e a vedação do § 3º, item 4.** O inciso XVI autoriza "a expedição de ofício ao juízo deprecante", e o § 3º, item 4, veda à secretaria subscrever "ofícios e demais expedientes para Órgãos Administrativos ou Jurisdicionais do Poder Judiciário dos Estados ou da União". Como o juízo deprecante é órgão jurisdicional, há tensão no próprio texto (talvez efeito do OCR). Por isso o XVI também foi marcado para revisão com o juízo. A ferramenta não bloqueia a palavra "ofício", porque outros incisos dependem dela.
- **Observações acrescentadas ao catálogo**, de caráter informativo: III e IV (dependem do "nada a opor" do juiz, conforme o próprio texto), IV e VIII (lembrete das vedações do § 3º), XII (contrafé pressupõe cópias físicas). Nenhuma delas desabilita o inciso.
- **Reconhecimento da tarefa no texto colado.** Para não levar nome de parte para as exportações, o parser só aceita como "tarefa" o campo rotulado "Tarefa:" ou o campo que contenha termos típicos de tarefa do PJe (`TERMOS_TAREFA` em `parser.js`). Campos como classe e partes são ignorados. Se o campo da tarefa também trouxer nome de parte, o servidor corrige na prévia.
- **Gabinete: tipo de minuta.** Por padrão, a prévia lê o tipo (despacho, decisão, sentença) no nome da tarefa, e usa "despacho" quando não reconhece. É rótulo de organização, visível e editável.
- **Dias corridos e suspensões.** Em dias corridos, a ferramenta desconta os períodos de suspensão cadastrados e conta feriados. Em dias úteis, desconta fins de semana, feriados e suspensões. A contagem começa no dia seguinte ao da entrada.

## Limites

- Não altera o PJe, não pratica atos e não decide nada.
- Não automatiza o PJe: sem raspagem, RPA, extensão de navegador ou API. A entrada é o que o servidor copia e cola; a saída é usada no PJe com as funções que o sistema já tem (etiquetas próprias e operações em lote).
- A ordem proposta é um guia, porque a lei fala em atendimento preferencial.
- A urgência é reconhecida pelo juiz.
- O Provimento nº 006/2006 remete ao CPC de 1973 e os modelos são validados pelo juízo.
- A validação do modelo é registrada por quem usa o computador da vara. A ferramenta guarda quem validou e quando, mas não autentica a pessoa.

## Para desenvolvedores

Requisitos: Node.js 20 ou superior. Sem dependências de npm.

```
node build.mjs              # gera dist/*_v1.html (recusa sobrescrever arquivo existente)
node build.mjs --sobrescrever   # só durante o desenvolvimento de versão ainda não entregue
npm test                    # testes de lógica (node --test)
npm run e2e                 # teste ponta a ponta offline com Playwright e capturas em docs/screenshots/
```

Versões: arquivo entregue não se sobrescreve. Para a próxima entrega, altere `VERSAO` em `build.mjs` (v2, v3...) e em `test/e2e/offline.e2e.mjs`; o build gera arquivos novos ao lado dos anteriores.

O build junta os módulos ES de `src/` num único escopo, remove `import` e `export`, recusa nomes duplicados entre módulos e verifica a saída: sem travessão, sem recurso externo, sem chamada de rede e sem `localStorage` fora das preferências de interface.

```
ferramentas-serventia-oab-maraba/
  build.mjs
  src/
    comum/        datas.js, prazos.js, mascara.js, parser.js, exporta.js, interface.js, estilo.css, logo_oab.png
    distribuidor/ processo.js, ordenacao.js, distribuicao.js, painel.js, ui.js, index.html
    atos-lote/    catalogo-prov-006-2006.js, modelos.js, gerador.js, ui.js, index.html
  test/           *.test.mjs, fixtures/ (só dados fictícios), e2e/offline.e2e.mjs
  dist/           distribuidor-tarefas_v1.html, atos-em-lote_v1.html
  docs/screenshots/
```

Critérios de aceite cobertos por teste automático:

| Critério | Onde |
|---|---|
| I.1 fixture reconhece números e datas; prévia lista o incompleto | `test/parser.test.mjs`, e2e |
| I.2 regra de ordenação nos três casos e sem pesos | `test/ordenacao.test.mjs` |
| I.3 alertas do art. 228 nos dois modos de contagem | `test/datas-prazos.test.mjs`, e2e |
| I.4 124 processos e 3 servidores: 41/41/42; fator de 50% | `test/distribuicao.test.mjs` |
| I.5 sigiloso mascarado em CSV e impressão | `test/ordenacao.test.mjs`, e2e |
| I.6 e II.7 funcionamento offline via `file://` | e2e |
| I.7 e II.8 nenhum travessão em `dist/` | `build.mjs`, e2e |
| II.1 28 incisos e incisos de revisão desabilitados | `test/atos-lote.test.mjs`, e2e |
| II.2 rascunho não gera lote; prévia com tarja | `test/atos-lote.test.mjs`, e2e |
| II.3 processo não lido nunca entra | `test/atos-lote.test.mjs`, e2e |
| II.4 todo ato termina com o fecho e o inciso correto | `test/atos-lote.test.mjs`, e2e |
| II.5 nenhum caminho para documento vedado | `test/atos-lote.test.mjs`, e2e |
| II.6 alterar modelo validado volta para rascunho | `test/atos-lote.test.mjs`, e2e |

---

Protótipo desenvolvido pela OAB/PA Subseção Marabá. Versão v1, novembro de 2026.
