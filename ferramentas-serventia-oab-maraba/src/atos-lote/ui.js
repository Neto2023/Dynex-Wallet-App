import { $, $$, el, anexar, limpar, avisar, abrirDialogo, ligarFechamentoDialogos, ligarTamanhoFonte, escolherArquivo } from '../comum/interface.js';
import { baixarArquivo, lerArquivoTexto, carimboArquivo, copiarTexto, prefLer, prefGravar } from '../comum/exporta.js';
import { formatarDataBR, agoraISO } from '../comum/datas.js';
import { extrairNumerosCNJ } from '../comum/parser.js';
import { CATALOGO_PROV_006_2006, VEDACOES_PROV_006_2006, CONFERENCIA_CATALOGO, buscarInciso } from './catalogo-prov-006-2006.js';
import { STATUS_MODELO, criarModelo, editarModelo, validarModelo, modeloValidado, problemasDoModelo, incisoHabilitado, exportarModelos, importarModelos, modeloExemploXV } from './modelos.js';
import { gerarPrevia, gerarLote, impedimentosDoLote, processosLidos, sugerirEtiqueta, textoArquivoLote, csvRelacaoLote, csvAuditoria, LEMBRETE_BERNA, AVISO_NAO_LIDO, TARJA_RASCUNHO } from './gerador.js';

// Estado em memória. Dados de processo nunca vão para o localStorage: só para o arquivo de sessão que o usuário baixa.
const estadoAtos = {
  inciso: 'XV',
  processos: [],
  modelos: [modeloExemploXV()],
  modeloId: 'exemplo-XV-1',
  servidor: '',
  auditoria: [],
  ultimoLote: null,
  edicao: null,
};

function modeloAtual() {
  return estadoAtos.modelos.find((m) => m.id === estadoAtos.modeloId && m.inciso === estadoAtos.inciso) || null;
}

function modelosDoInciso() {
  return estadoAtos.modelos.filter((m) => m.inciso === estadoAtos.inciso);
}

function edicaoPendente() {
  const m = modeloAtual();
  const e = estadoAtos.edicao;
  return !!(m && e && (e.titulo !== m.titulo || e.texto !== m.texto || e.prazo !== m.prazo));
}

function renderizarTudoAtos() {
  renderizarIncisos();
  renderizarDetalheInciso();
  renderizarProcessos();
  renderizarSeletorModelo();
  renderizarEditor();
  renderizarPreviaEGerar();
  renderizarAuditoria();
}

// ---------- Coluna 1: hipótese ----------

function renderizarIncisos() {
  const alvo = limpar($('#lista-incisos'));
  for (const c of CATALOGO_PROV_006_2006) {
    const habil = incisoHabilitado(c, estadoAtos.modelos);
    alvo.append(el('button', {
      type: 'button', 'aria-pressed': String(c.inciso === estadoAtos.inciso), 'aria-disabled': habil ? null : 'true',
      dataset: { inciso: c.inciso }, title: habil ? c.rotulo : 'Revisar aplicabilidade com o juízo',
    }, el('span', { class: 'rom' }, c.inciso), c.rotulo, habil ? null : el('div', {}, el('span', { class: 'selo revisar' }, 'Revisar aplicabilidade com o juízo'))));
  }
}

function renderizarDetalheInciso() {
  const c = buscarInciso(estadoAtos.inciso);
  const habil = incisoHabilitado(c, estadoAtos.modelos);
  const alvo = limpar($('#detalhe-inciso'));
  anexar(alvo,
    el('h3', {}, `Inciso ${c.inciso}: ${c.rotulo}`),
    el('div', { class: 'literal' }, c.textoLiteral),
    c.remissaoCPC1973 ? el('p', { class: 'pequeno muted' }, `Remissão ao CPC de 1973: ${c.remissaoCPC1973}.`) : null,
    c.observacao ? el('p', { class: 'pequeno' }, el('strong', {}, 'Observação: '), c.observacao) : null,
    !habil ? el('div', { class: 'pendente' }, el('span', { class: 'selo revisar' }, 'Revisar aplicabilidade com o juízo'),
      ' Inciso desabilitado até existir modelo validado pelo juízo. A ferramenta não decide se o inciso ainda se aplica.') : null,
  );
  $('#etiqueta-sugerida').textContent = sugerirEtiqueta(c.inciso);
}

// ---------- Coluna 2: processos ----------

function reconhecerProcessos() {
  const texto = $('#txt-processos').value;
  const numeros = extrairNumerosCNJ(texto);
  const linhasSemNumero = texto.split(/\r?\n/).filter((l) => l.trim() && !extrairNumerosCNJ(l).length).length;
  if (!numeros.length) { avisar('Nenhum número de processo reconhecido.', 'erro'); return; }
  const existentes = new Map(estadoAtos.processos.map((p) => [p.numero, p]));
  let novos = 0, repetidos = 0;
  for (const n of numeros) {
    if (existentes.has(n)) { repetidos++; continue; }
    const p = { numero: n, lido: false };
    estadoAtos.processos.push(p);
    existentes.set(n, p);
    novos++;
  }
  const av = limpar($('#avisos-processos'));
  const msgs = [`${novos} processo(s) incluído(s), todos como "não lido".`];
  if (repetidos) msgs.push(`${repetidos} repetido(s) ignorado(s).`);
  if (linhasSemNumero) msgs.push(`${linhasSemNumero} linha(s) sem número de processo ignorada(s).`);
  av.append(el('div', { class: 'info pequeno' }, msgs.join(' ')));
  renderizarProcessos();
  renderizarPreviaEGerar();
}

function renderizarProcessos() {
  const corpo = limpar($('#processos-corpo'));
  if (!estadoAtos.processos.length) {
    corpo.append(el('tr', {}, el('td', { colspan: 3, class: 'vazio' }, 'Nenhum processo. Cole a relação dos processos etiquetados.')));
  }
  estadoAtos.processos.forEach((p, i) => {
    const chk = el('input', { type: 'checkbox', checked: p.lido === true, 'aria-label': `Lido individualmente: ${p.numero}` });
    chk.addEventListener('change', () => { p.lido = chk.checked; renderizarProcessos(); renderizarPreviaEGerar(); });
    corpo.append(el('tr', { class: p.lido ? '' : 'nao-lido' },
      el('td', { class: 'num' }, p.numero),
      el('td', {}, el('label', {}, chk, 'Lido'), el('div', {}, p.lido ? el('span', { class: 'selo ok' }, 'Entra no lote') : el('span', { class: 'selo alerta' }, AVISO_NAO_LIDO))),
      el('td', {}, el('button', { type: 'button', class: 'discreto', onclick: () => { estadoAtos.processos.splice(i, 1); renderizarProcessos(); renderizarPreviaEGerar(); } }, 'Tirar'))));
  });
  const lidos = processosLidos(estadoAtos.processos).length;
  $('#contagem-lidos').textContent = `${lidos} lido(s) de ${estadoAtos.processos.length}. Só os lidos entram no lote.`;
}

// ---------- Coluna 3: modelo e texto ----------

function renderizarSeletorModelo() {
  const sel = limpar($('#sel-modelo'));
  const lista = modelosDoInciso();
  if (!lista.length) sel.append(el('option', { value: '' }, '(nenhum modelo para este inciso)'));
  for (const m of lista) sel.append(el('option', { value: m.id }, `${m.titulo || 'Sem título'} · v${m.versao} · ${STATUS_MODELO[modeloValidado(m) ? 'validado_pelo_juizo' : 'rascunho']}`));
  if (!lista.some((m) => m.id === estadoAtos.modeloId)) estadoAtos.modeloId = lista[0]?.id || '';
  sel.value = estadoAtos.modeloId;
}

function iniciarEdicao() {
  const m = modeloAtual();
  estadoAtos.edicao = m ? { titulo: m.titulo, texto: m.texto, prazo: m.prazo } : null;
}

function renderizarEditor() {
  const alvo = limpar($('#editor-modelo'));
  const m = modeloAtual();
  if (!m) {
    alvo.append(el('p', { class: 'muted' }, 'Nenhum modelo para este inciso. Clique em "Novo modelo" ou importe modelos validados.'));
    return;
  }
  if (!estadoAtos.edicao) iniciarEdicao();
  const e = estadoAtos.edicao;
  const validado = modeloValidado(m);
  const titulo = el('input', { type: 'text', value: e.titulo, id: 'mod-titulo' });
  const texto = el('textarea', { class: 'modelo', id: 'mod-texto', spellcheck: 'true' }, e.texto);
  const prazo = el('input', { type: 'text', value: e.prazo, id: 'mod-prazo', placeholder: 'ex.: 15 (quinze) dias', size: 22 });
  const marcar = () => {
    e.titulo = titulo.value; e.texto = texto.value; e.prazo = prazo.value;
    $('#mod-pendente').hidden = !edicaoPendente();
    $('#bt-salvar-modelo').disabled = !edicaoPendente();
    $('#bt-validar').disabled = edicaoPendente() || problemasDoModelo(m).length > 0;
  };
  [titulo, texto, prazo].forEach((c) => c.addEventListener('input', marcar));
  const problemas = problemasDoModelo(m);
  const habil = incisoHabilitado(buscarInciso(m.inciso), estadoAtos.modelos);

  anexar(alvo,
    el('div', { class: 'linha', style: 'margin:.3rem 0' },
      el('span', { class: `selo ${validado ? 'ok' : 'alerta'}` }, STATUS_MODELO[validado ? 'validado_pelo_juizo' : 'rascunho']),
      el('span', { class: 'pequeno muted' }, `versão ${m.versao}`),
      validado ? el('span', { class: 'pequeno muted' }, `validado por ${m.validadoPor} em ${formatarDataBR(m.validadoEm)}`) : null),
    !habil ? el('div', { class: 'pendente' }, 'Inciso marcado para revisão de aplicabilidade: o modelo só habilita o inciso depois de validado pelo juízo.') : null,
    el('label', { class: 'campo' }, el('span', {}, 'Título do modelo'), titulo),
    el('label', { class: 'campo' }, el('span', {}, 'Texto do ato (sem o fecho, que é inserido automaticamente)'), texto),
    el('p', { class: 'pequeno muted' }, 'Variáveis permitidas: {{numero}}, {{prazo}}, {{data}}, {{servidor}}. Não use dado de parte no modelo.'),
    el('label', { class: 'campo' }, el('span', {}, 'Prazo ({{prazo}}), preenchido na validação'), prazo),
    el('p', { class: 'pequeno muted' }, 'O provimento remete ao CPC de 1973. A ferramenta não converte prazos: o juízo informa o prazo ao validar.'),
    el('p', { id: 'mod-pendente', class: 'pequeno', style: 'color:var(--vermelho)', hidden: !edicaoPendente() }, 'Alterações não salvas. A prévia mostra a versão salva.'),
    problemas.length ? el('div', { class: 'alerta-caixa pequeno' }, el('strong', {}, 'Pendências do modelo:'), ...problemas.map((p) => el('div', {}, p))) : null,
    el('div', { class: 'linha' },
      el('button', { type: 'button', id: 'bt-salvar-modelo', class: 'primario', disabled: !edicaoPendente(), onclick: salvarModelo }, 'Salvar alterações'),
      el('button', { type: 'button', class: 'discreto', onclick: () => { iniciarEdicao(); renderizarEditor(); } }, 'Descartar alterações'),
      el('button', { type: 'button', class: 'perigo', onclick: excluirModelo }, 'Excluir modelo')),
    el('fieldset', {}, el('legend', {}, 'Validação pelo juízo'),
      el('div', { class: 'linha', style: 'align-items:flex-end' },
        el('label', { class: 'campo' }, el('span', {}, 'Validado por'), el('input', { type: 'text', id: 'mod-validador', size: 26, placeholder: 'magistrado ou servidor designado' })),
        el('button', { type: 'button', id: 'bt-validar', disabled: edicaoPendente() || problemas.length > 0, onclick: registrarValidacao }, 'Registrar validação pelo juízo')),
      el('p', { class: 'pequeno muted' }, 'Qualquer alteração posterior no texto, no título ou no prazo volta o modelo para rascunho.')),
  );
}

function salvarModelo() {
  const m = modeloAtual();
  if (!m || !edicaoPendente()) return;
  if (modeloValidado(m) && !confirm('Este modelo está validado pelo juízo. Salvar a alteração volta o modelo para rascunho e exige nova validação. Continuar?')) return;
  const novo = editarModelo(m, estadoAtos.edicao);
  estadoAtos.modelos = estadoAtos.modelos.map((x) => (x.id === m.id ? novo : x));
  iniciarEdicao();
  renderizarTudoAtos();
  avisar(`Modelo salvo (versão ${novo.versao}, rascunho).`, 'ok');
}

function registrarValidacao() {
  const m = modeloAtual();
  if (!m) return;
  const r = validarModelo(m, { por: $('#mod-validador').value, em: agoraISO() });
  if (!r.ok) { avisar(r.erros.join(' '), 'erro'); return; }
  estadoAtos.modelos = estadoAtos.modelos.map((x) => (x.id === m.id ? r.modelo : x));
  iniciarEdicao();
  renderizarTudoAtos();
  avisar('Validação registrada.', 'ok');
}

function novoModelo() {
  const c = buscarInciso(estadoAtos.inciso);
  const m = criarModelo({ inciso: c.inciso, titulo: `${c.rotulo} (modelo)`, texto: 'ATO ORDINATÓRIO. ' });
  estadoAtos.modelos.push(m);
  estadoAtos.modeloId = m.id;
  iniciarEdicao();
  renderizarTudoAtos();
  $('#mod-texto')?.focus();
}

function excluirModelo() {
  const m = modeloAtual();
  if (!m || !confirm(`Excluir o modelo "${m.titulo || m.id}" desta sessão?`)) return;
  estadoAtos.modelos = estadoAtos.modelos.filter((x) => x.id !== m.id);
  estadoAtos.modeloId = '';
  estadoAtos.edicao = null;
  renderizarTudoAtos();
}

function renderizarPreviaEGerar() {
  const m = modeloAtual();
  const caixa = limpar($('#previa-ato'));
  const primeiro = processosLidos(estadoAtos.processos)[0];
  if (!m) {
    caixa.className = 'texto-ato';
    caixa.append(el('span', { class: 'muted' }, 'Sem modelo para prévia.'));
  } else {
    const pv = gerarPrevia(m, { numero: primeiro?.numero, data: formatarDataBR(agoraISO(), { hora: false }), servidor: estadoAtos.servidor });
    caixa.className = 'texto-ato' + (pv.tarja ? ' rascunho' : '');
    if (pv.tarja) caixa.append(el('span', { class: 'tarja' }, TARJA_RASCUNHO));
    caixa.append(pv.texto);
  }
  const imp = impedimentosDoLote({ modelo: m, processos: estadoAtos.processos, servidor: estadoAtos.servidor, modelos: estadoAtos.modelos });
  const n = processosLidos(estadoAtos.processos).length;
  const bt = $('#bt-gerar');
  bt.disabled = imp.length > 0;
  bt.textContent = `Gerar ${n} ato${n === 1 ? '' : 's'} do lote`;
  const alvo = limpar($('#impedimentos'));
  if (imp.length) alvo.append(el('div', { class: 'pequeno', style: 'color:var(--vermelho)' }, ...imp.map((i) => el('div', {}, i))));
}

function gerar() {
  const r = gerarLote({ modelo: modeloAtual(), processos: estadoAtos.processos, servidor: estadoAtos.servidor, dataHora: agoraISO(), modelos: estadoAtos.modelos });
  if (!r.ok) { avisar(r.impedimentos.join(' '), 'erro'); return; }
  estadoAtos.ultimoLote = r;
  estadoAtos.auditoria.push(r.registro);
  renderizarSaida();
  renderizarAuditoria();
  $('#cartao-saida').scrollIntoView({ behavior: 'smooth', block: 'start' });
  avisar(`${r.atos.length} ato(s) gerado(s).`, 'ok');
}

function renderizarSaida() {
  const lote = estadoAtos.ultimoLote;
  $('#cartao-saida').hidden = !lote;
  if (!lote) return;
  const r = lote.registro;
  $('#saida-resumo').textContent = `${lote.atos.length} ato(s) · inciso ${r.inciso} · modelo "${r.modeloTitulo}" versão ${r.versaoModelo} · servidor ${r.servidor} · ${formatarDataBR(r.dataHora)}`
    + (lote.excluidos.length ? ` · ${lote.excluidos.length} processo(s) não lido(s) ficaram fora do lote.` : '.');
  const unico = limpar($('#saida-unico'));
  if (lote.textoUnico) {
    unico.append(
      el('p', { class: 'pequeno' }, 'O texto é idêntico para todos os processos do lote: use-o na operação em lote do PJe, pela etiqueta ', el('strong', {}, lote.etiqueta), '.'),
      el('div', { class: 'texto-ato', id: 'texto-unico' }, lote.textoUnico),
      el('div', { class: 'linha', style: 'margin-top:.4rem' }, el('button', { type: 'button', class: 'primario', onclick: async () => avisar(await copiarTexto(lote.textoUnico) ? 'Texto copiado.' : 'Não foi possível copiar.', 'ok') }, 'Copiar o texto único do lote')));
  } else {
    unico.append(el('div', { class: 'info' }, 'O modelo usa {{numero}}: o texto muda de processo para processo. Copie por processo (abaixo) ou baixe o .txt.'));
  }
  const lista = limpar($('#saida-por-processo'));
  for (const a of lote.atos) {
    lista.append(el('div', { class: 'ato-item' },
      el('div', { class: 'linha' }, el('strong', { class: 'num' }, a.numero),
        el('button', { type: 'button', class: 'discreto', onclick: async () => avisar(await copiarTexto(a.texto) ? `Texto de ${a.numero} copiado.` : 'Não foi possível copiar.', 'ok') }, 'Copiar')),
      el('div', { class: 'texto-ato' }, a.texto)));
  }
}

function renderizarAuditoria() {
  const corpo = limpar($('#auditoria-corpo'));
  if (!estadoAtos.auditoria.length) {
    corpo.append(el('tr', {}, el('td', { colspan: 7, class: 'vazio' }, 'Nenhum lote gerado nesta sessão.')));
    return;
  }
  for (const r of estadoAtos.auditoria.slice().reverse()) {
    corpo.append(el('tr', {},
      el('td', {}, formatarDataBR(r.dataHora)), el('td', {}, r.servidor), el('td', {}, r.inciso),
      el('td', {}, r.modeloTitulo || r.modeloId), el('td', {}, String(r.versaoModelo)), el('td', {}, r.validadoPor || ''),
      el('td', { class: 'num pequeno' }, r.processos.join(', '))));
  }
}

// ---------- Sessão ----------

function sessaoAtosAtual() {
  return {
    tipo: 'sessao-atos-lote',
    versaoFormato: 1,
    ferramenta: 'Gerador de Atos Ordinatórios em Lote __VERSAO__',
    salvoEm: agoraISO(),
    aviso: 'Arquivo de trabalho da vara. Contém números de processo: não compartilhe fora da unidade.',
    servidor: estadoAtos.servidor,
    inciso: estadoAtos.inciso,
    processos: estadoAtos.processos,
    modelos: estadoAtos.modelos,
    auditoria: estadoAtos.auditoria,
  };
}

function abrirSessaoAtos(dados) {
  if (!dados || dados.tipo !== 'sessao-atos-lote') throw new Error('Arquivo não é uma sessão do Gerador de Atos em Lote.');
  const imp = importarModelos(JSON.stringify({ modelos: dados.modelos || [] }));
  estadoAtos.modelos = imp.modelos;
  estadoAtos.processos = (Array.isArray(dados.processos) ? dados.processos : [])
    .filter((p) => p && extrairNumerosCNJ(p.numero).length).map((p) => ({ numero: extrairNumerosCNJ(p.numero)[0], lido: p.lido === true }));
  estadoAtos.auditoria = Array.isArray(dados.auditoria) ? dados.auditoria.filter((r) => r && Array.isArray(r.processos)) : [];
  estadoAtos.servidor = String(dados.servidor || '');
  estadoAtos.inciso = buscarInciso(dados.inciso) ? dados.inciso : 'XV';
  estadoAtos.modeloId = '';
  estadoAtos.edicao = null;
  estadoAtos.ultimoLote = null;
  $('#servidor').value = estadoAtos.servidor;
  return imp.avisos;
}

async function abrirArquivoJSON(acao) {
  const arq = await escolherArquivo('.json,application/json');
  if (!arq) return;
  try {
    const avisos = acao(JSON.parse(await lerArquivoTexto(arq))) || [];
    renderizarTudoAtos();
    renderizarSaida();
    avisar(avisos.length ? avisos.join(' ') : 'Arquivo aberto.', avisos.length ? 'erro' : 'ok');
  } catch (e) {
    avisar('Não foi possível abrir: ' + e.message, 'erro');
  }
}

// ---------- Ligações ----------

function ligarEventosAtos() {
  ligarFechamentoDialogos();
  ligarTamanhoFonte('bt-fonte-menos', 'bt-fonte-mais');
  $('#lembrete-berna').textContent = LEMBRETE_BERNA;
  $('#aviso-ocr').textContent = '[PENDENTE] ' + CONFERENCIA_CATALOGO.aviso;
  const ol = limpar($('#lista-vedacoes'));
  VEDACOES_PROV_006_2006.forEach((v) => ol.append(el('li', {}, v)));

  $('#lista-incisos').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-inciso]');
    if (!b) return;
    if (edicaoPendente() && !confirm('Há alterações não salvas no modelo. Trocar de inciso e descartá-las?')) return;
    estadoAtos.inciso = b.dataset.inciso;
    estadoAtos.modeloId = '';
    estadoAtos.edicao = null;
    prefGravar('atos-inciso', estadoAtos.inciso);
    renderizarTudoAtos();
  });
  $('#sel-modelo').addEventListener('change', (ev) => {
    if (edicaoPendente() && !confirm('Há alterações não salvas no modelo. Trocar e descartá-las?')) { ev.target.value = estadoAtos.modeloId; return; }
    estadoAtos.modeloId = ev.target.value;
    estadoAtos.edicao = null;
    renderizarEditor();
    renderizarPreviaEGerar();
  });
  $('#bt-novo-modelo').addEventListener('click', novoModelo);
  $('#servidor').addEventListener('input', (ev) => { estadoAtos.servidor = ev.target.value.trim(); renderizarPreviaEGerar(); });
  $('#bt-reconhecer-processos').addEventListener('click', reconhecerProcessos);
  $('#bt-exemplo-processos').addEventListener('click', () => { $('#txt-processos').value = EXEMPLO_LOTE; avisar('Exemplo com dados fictícios carregado. Clique em "Reconhecer números".'); });
  $('#bt-limpar-processos').addEventListener('click', () => {
    if (estadoAtos.processos.length && !confirm('Esvaziar a relação de processos?')) return;
    estadoAtos.processos = [];
    $('#txt-processos').value = '';
    limpar($('#avisos-processos'));
    renderizarProcessos();
    renderizarPreviaEGerar();
  });
  $('#bt-copiar-etiqueta').addEventListener('click', async () => avisar(await copiarTexto($('#etiqueta-sugerida').textContent) ? 'Nome da etiqueta copiado.' : 'Não foi possível copiar.', 'ok'));
  $('#bt-gerar').addEventListener('click', gerar);
  $('#bt-baixar-txt').addEventListener('click', () => {
    const l = estadoAtos.ultimoLote;
    if (l) baixarArquivo(`lote_inciso-${l.registro.inciso}_${carimboArquivo()}.txt`, textoArquivoLote(l));
  });
  $('#bt-baixar-relacao').addEventListener('click', () => {
    const l = estadoAtos.ultimoLote;
    if (l) baixarArquivo(`relacao-lote_inciso-${l.registro.inciso}_${carimboArquivo()}.csv`, csvRelacaoLote(l), 'text/csv;charset=utf-8');
  });
  $('#bt-csv-auditoria').addEventListener('click', () => baixarArquivo(`auditoria-atos-lote_${carimboArquivo()}.csv`, csvAuditoria(estadoAtos.auditoria), 'text/csv;charset=utf-8'));
  $('#bt-exportar-modelos').addEventListener('click', () => baixarArquivo(`modelos-atos-ordinatorios_${carimboArquivo()}.json`, exportarModelos(estadoAtos.modelos, agoraISO()), 'application/json'));
  $('#bt-importar-modelos').addEventListener('click', () => abrirArquivoJSON((dados) => {
    const imp = importarModelos(JSON.stringify(dados));
    const ids = new Set(imp.modelos.map((m) => m.id));
    estadoAtos.modelos = [...estadoAtos.modelos.filter((m) => !ids.has(m.id)), ...imp.modelos];
    estadoAtos.edicao = null;
    return [`${imp.modelos.length} modelo(s) importado(s).`, ...imp.avisos].filter((x, i) => i > 0 || imp.avisos.length);
  }));
  $('#bt-sobre').addEventListener('click', () => abrirDialogo('dlg-sobre'));
  $('#bt-salvar-sessao').addEventListener('click', () => {
    baixarArquivo(`sessao-atos-lote_${carimboArquivo()}.json`, JSON.stringify(sessaoAtosAtual(), null, 2), 'application/json');
    avisar('Sessão salva no arquivo baixado. Guarde-o na pasta da vara.', 'ok');
  });
  $('#bt-abrir-sessao').addEventListener('click', () => {
    if ((estadoAtos.processos.length || estadoAtos.auditoria.length) && !confirm('Abrir outra sessão substitui os dados atuais. Continuar?')) return;
    abrirArquivoJSON(abrirSessaoAtos);
  });
  window.addEventListener('beforeunload', (ev) => {
    if (estadoAtos.processos.length || estadoAtos.auditoria.length) { ev.preventDefault(); ev.returnValue = ''; }
  });

  const incisoSalvo = prefLer('atos-inciso', 'XV');
  if (buscarInciso(incisoSalvo)) estadoAtos.inciso = incisoSalvo;
  renderizarTudoAtos();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligarEventosAtos);
  else ligarEventosAtos();
}
