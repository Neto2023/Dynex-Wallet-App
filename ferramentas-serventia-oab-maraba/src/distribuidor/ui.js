import { $, $$, el, anexar, limpar, mostrarErros, atualizarAbas, ligarAbasTeclado, avisar, abrirDialogo, fecharDialogo, ligarFechamentoDialogos, ligarTamanhoFonte, escolherArquivo, imprimirConteudo } from '../comum/interface.js';
import { baixarArquivo, lerArquivoTexto, carimboArquivo, prefLer, prefGravar } from '../comum/exporta.js';
import { formatarDataBR, lerData, hojeISO, agoraISO, montarISO, partesISO, pad2 } from '../comum/datas.js';
import { normalizarContagem, lerFeriados, lerSuspensoes, feriadosParaTexto, suspensoesParaTexto, FERIADOS_NACIONAIS_2026, ROTULOS_228 } from '../comum/prazos.js';
import { numeroPublico } from '../comum/mascara.js';
import { reconhecerTextoLivre, lerTabela, aplicarMapeamento, sugerirMapeamento, normalizarMapa, criarPerfilMapeamento, aplicarPerfilMapeamento, CAMPOS_MAPEAMENTO, RE_CNJ } from '../comum/parser.js';
import { novoProcesso, tipoMinutaPelaTarefa, MODULOS, TIPOS_MINUTA } from './processo.js';
import { ROTULOS_LISTA, ROTULOS_PREFERENCIA, rotuloPreferencia } from './ordenacao.js';
import { distribuir, aplicarDistribuicao, contarPorResponsavel, normalizarServidores, compararNomes } from './distribuicao.js';
import { montarPainel, rotuloListaEntrada, csvPainel, FRASE_MARCO_228, TEXTO_REGRA, TEXTO_RODAPE } from './painel.js';

// Estado em memória. Dados de processo nunca vão para o localStorage: só para o arquivo de sessão que o usuário baixa.
const estadoDist = {
  modulo: 'secretaria',
  dados: {
    secretaria: { processos: [], servidores: [], resumo: '' },
    gabinete: { processos: [], servidores: [], resumo: '' },
  },
  config: { contagem: { modo: 'uteis', feriados: [], suspensoes: [] }, referencia: '', perfilMapeamento: null },
  lista: 'urgencia',
  servidorFila: '',
  previa: null,
  tabela: null,
  editando: null,
  painel: null,
};

const PREFERENCIAS_EDITAVEIS = ['idoso', 'doenca_grave', 'eca', 'violencia_domestica', 'licitacao'];

function moduloAtual() {
  return estadoDist.dados[estadoDist.modulo];
}

function referenciaAtual() {
  return estadoDist.config.referencia || hojeISO();
}

function temDados() {
  return Object.values(estadoDist.dados).some((d) => d.processos.length > 0);
}

function recalcularPainel() {
  const mod = moduloAtual();
  estadoDist.painel = montarPainel(mod.processos, {
    modulo: estadoDist.modulo,
    referencia: referenciaAtual(),
    contagem: estadoDist.config.contagem,
    servidores: mod.servidores,
  });
}

function rotuloContagem() {
  return estadoDist.config.contagem.modo === 'corridos' ? 'dias corridos' : 'dias úteis';
}

// ---------- Renderização ----------

function renderizarTudo() {
  recalcularPainel();
  renderizarAbasModulo();
  renderizarServidores();
  renderizarContadores();
  renderizarLista();
  $('#th-dias').textContent = estadoDist.config.contagem.modo === 'corridos' ? 'Dias (corridos)' : 'Dias (úteis)';
  const modoPadrao = estadoDist.config.contagem.modo === 'uteis' ? ' (padrão provisório, pendente de decisão do juízo)' : '';
  $('#nota-lista').textContent = `${FRASE_MARCO_228} Contagem em ${rotuloContagem()}${modoPadrao}, com referência em ${formatarDataBR(referenciaAtual(), { hora: false })}.`;
}

function renderizarAbasModulo() {
  $$('[data-modulo]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.modulo === estadoDist.modulo)));
  const gab = estadoDist.modulo === 'gabinete';
  $('#previa-minuta-campo').hidden = !gab;
  const abaModulo = $(`[data-modulo="${estadoDist.modulo}"]`);
  if (abaModulo) $('#painel-modulo').setAttribute('aria-labelledby', abaModulo.id);
  atualizarAbas($('.modulos [role=tablist]'));
}

function renderizarContadores() {
  const c = estadoDist.painel.contadores;
  const caixas = [
    ['urg', c.urgencia, 'Urgentes (reconhecidas pelo juiz)'],
    ['pref', c.preferencia, estadoDist.modulo === 'gabinete' ? 'Preferências legais e metas do CNJ' : 'Preferências legais'],
    ['ger', c.geral, 'Lista geral'],
    ['alerta', c.acimaPrazo, `Acima do prazo do art. 228 (${rotuloContagem()})`],
    ['alerta', c.concorrentes, 'Preferências concorrentes: decisão do juiz'],
  ];
  const alvo = limpar($('#contadores'));
  for (const [cls, valor, rotulo] of caixas) {
    alvo.append(el('div', { class: `contador ${cls}` }, el('div', { class: 'valor' }, String(valor)), el('div', { class: 'rotulo' }, rotulo)));
  }
  for (const lista of ['urgencia', 'preferencia', 'geral']) {
    const s = $(`[data-cont="${lista}"]`);
    if (s) s.textContent = String(c[lista]);
  }
}

function entradasDaLista() {
  const p = estadoDist.painel;
  if (estadoDist.lista === 'todas') return p.sequencia.map((e) => ({ ...e, ordemExibida: e.posicao }));
  if (estadoDist.lista === 'servidor') {
    return p.sequencia.filter((e) => e.processo.responsavel === estadoDist.servidorFila)
      .map((e, i) => ({ ...e, ordemExibida: i + 1 }));
  }
  return p[estadoDist.lista].map((e) => ({ ...e, ordemExibida: e.ordem }));
}

function celulaProcesso(p) {
  return el('td', {},
    el('span', { class: 'num' }, p.numero),
    el('div', {}, el('button', { type: 'button', class: 'discreto editar', 'aria-label': `Editar ${p.numero}` }, 'Editar')),
    p.sigiloso ? el('div', {}, el('span', { class: 'selo sigilo' }, 'SIGILOSO')) : null);
}

function celulaProvidencia(p) {
  const partes = [];
  if (estadoDist.modulo === 'gabinete' && p.tipoMinuta) partes.push(el('span', { class: 'selo' }, TIPOS_MINUTA[p.tipoMinuta]));
  partes.push(p.providencia || p.tarefa || '');
  if (p.etiquetas && p.etiquetas.length) partes.push(el('div', { class: 'muted pequeno' }, 'Etiquetas: ' + p.etiquetas.join(', ')));
  return el('td', {}, ...partes);
}

function celulaLista(e) {
  const cls = e.lista === 'urgencia' ? 'urg' : e.lista === 'preferencia' ? 'pref' : '';
  const ref = e.lista === 'urgencia' && e.processo.urgenciaJuiz.referencia ? el('div', { class: 'muted pequeno' }, 'Ref.: ' + e.processo.urgenciaJuiz.referencia) : null;
  const ordemJuiz = Number.isInteger(e.processo.ordemDefinidaPeloJuiz) && e.lista === 'preferencia'
    ? el('div', { class: 'muted pequeno' }, `Ordem definida pelo juiz: ${e.processo.ordemDefinidaPeloJuiz}`) : null;
  return el('td', {}, el('span', { class: `selo ${cls}` }, rotuloListaEntrada(e)), ref, ordemJuiz);
}

function renderizarLista() {
  $$('#abas-listas [data-lista]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.lista === estadoDist.lista)));
  atualizarAbas($('#abas-listas'));
  $('#painel-lista').setAttribute('aria-labelledby', $('#abas-listas [aria-selected=true]').id);
  const barra = $('#barra-servidor');
  barra.hidden = estadoDist.lista !== 'servidor';
  if (estadoDist.lista === 'servidor') {
    const sel = limpar($('#sel-servidor-fila'));
    const servidores = normalizarServidores(moduloAtual().servidores).sort((a, b) => compararNomes(a.nome, b.nome));
    if (!servidores.some((s) => s.nome === estadoDist.servidorFila)) estadoDist.servidorFila = servidores[0]?.nome || '';
    for (const s of servidores) sel.append(el('option', { value: s.nome }, s.nome));
    sel.value = estadoDist.servidorFila;
  }
  const corpo = limpar($('#lista-corpo'));
  const entradas = entradasDaLista();
  if (!entradas.length) {
    const msg = estadoDist.lista === 'servidor' && !estadoDist.servidorFila
      ? 'Cadastre servidores e clique em "Distribuir a carga".'
      : moduloAtual().processos.length ? 'Nenhum processo nesta lista.' : 'Nenhum processo na fila. Use a entrada de dados acima.';
    corpo.append(el('tr', {}, el('td', { colspan: 8, class: 'vazio' }, msg)));
    return;
  }
  for (const e of entradas) {
    const p = e.processo;
    const tr = el('tr', { class: 'clicavel', dataset: { numero: p.numero }, title: 'Clique para editar' },
      el('td', { class: 'dias' }, String(e.ordemExibida)),
      celulaProcesso(p),
      celulaProvidencia(p),
      el('td', { class: 'num' }, p.dataEntrada ? formatarDataBR(p.dataEntrada) : 'sem data'),
      el('td', { class: 'dias' }, e.dias === null || e.dias === undefined ? '' : String(e.dias)),
      celulaLista(e),
      el('td', {}, p.responsavel || el('span', { class: 'muted' }, '(sem)'), p.responsavelFixado ? el('div', { class: 'muted pequeno' }, 'fixado') : null),
      el('td', { class: 'alertas-celula' }, ...e.alertas.map((a) => el('div', {}, a))),
    );
    corpo.append(tr);
  }
}

function renderizarServidores() {
  const mod = moduloAtual();
  const { contagem } = contarPorResponsavel(mod.processos, mod.servidores);
  const corpo = limpar($('#servidores-corpo'));
  if (!mod.servidores.length) {
    corpo.append(el('tr', {}, el('td', { colspan: 4, class: 'vazio' }, 'Nenhum servidor cadastrado neste módulo.')));
  }
  mod.servidores.forEach((s, i) => {
    const fator = el('input', { type: 'number', min: 10, max: 100, step: 5, value: Math.round(s.fator * 100), style: 'width:4.5rem', 'aria-label': `Fator de ${s.nome}` });
    fator.addEventListener('change', () => {
      const v = Number(fator.value);
      if (!(v >= 10 && v <= 100)) { avisar('O fator deve ficar entre 10% e 100%.', 'erro'); fator.value = Math.round(s.fator * 100); return; }
      s.fator = v / 100;
      avisar('Fator alterado. Clique em "Distribuir a carga" para redistribuir.');
    });
    corpo.append(el('tr', {},
      el('td', {}, s.nome),
      el('td', {}, fator, ' %'),
      el('td', { class: 'dias' }, String(contagem[s.nome] ?? 0)),
      el('td', {}, el('button', { type: 'button', class: 'discreto', 'aria-label': `Remover ${s.nome}`, onclick: () => removerServidor(i) }, 'Remover'))));
  });
  const r = $('#resumo-distribuicao');
  r.hidden = !mod.resumo;
  r.textContent = mod.resumo ? 'Distribuição: ' + mod.resumo : '';
}

// ---------- Entrada de dados ----------

function mostrarEntrada(tipo) {
  $$('[data-entrada]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.entrada === tipo)));
  $('#entrada-texto').hidden = tipo !== 'texto';
  $('#entrada-tabela').hidden = tipo !== 'tabela';
  $('#entrada-manual').hidden = tipo !== 'manual';
  atualizarAbas($('#cartao-entrada [role=tablist]'));
}

function abrirPrevia(resultado) {
  const numerosNaFila = new Set(moduloAtual().processos.map((p) => p.numero));
  estadoDist.previa = {
    ...resultado,
    itens: resultado.itens.map((it) => ({ ...it, incluir: true, jaNaFila: numerosNaFila.has(it.numero) })),
  };
  renderizarPrevia();
  $('#previa').hidden = false;
  $('#previa').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderizarPrevia() {
  const pv = estadoDist.previa;
  if (!pv) { $('#previa').hidden = true; return; }
  const semData = pv.itens.filter((i) => !i.dataEntrada).length;
  const varias = pv.itens.filter((i) => i.datasEncontradas.length > 1).length;
  const semNumero = pv.incompletos.filter((i) => i.tipo === 'sem_numero');
  $('#previa-resumo').textContent = `${pv.itens.length} processo(s) reconhecido(s). ${semData} sem data. ${varias} com mais de uma data (escolha a correta). ${semNumero.length} linha(s) sem número de processo, ignorada(s). ${pv.avisos.length} número(s) repetido(s).`;
  const avisos = limpar($('#previa-avisos'));
  if (pv.avisos.length) {
    avisos.append(el('div', { class: 'pendente' }, el('strong', {}, 'Repetidos: '),
      pv.avisos.map((a) => `${a.numero} ${a.mensagem}${a.dataMantida ? ' (' + formatarDataBR(a.dataMantida) + ')' : ''}`).join('; ') + '.'));
  }
  if (semNumero.length) {
    const det = el('details', { class: 'pendente' }, el('summary', {}, `Linhas sem número de processo (${semNumero.length}), fora da prévia`));
    semNumero.slice(0, 50).forEach((i) => det.append(el('div', { class: 'num pequeno' }, `linha ${i.linha}: ${i.trecho}`)));
    avisos.append(det);
  }
  const corpo = limpar($('#previa-corpo'));
  pv.itens.forEach((it, idx) => {
    const chk = el('input', { type: 'checkbox', checked: it.incluir, 'aria-label': `Incluir ${it.numero}` });
    chk.addEventListener('change', () => { it.incluir = chk.checked; renderizarPrevia(); });
    let campoData;
    if (it.datasEncontradas.length > 1) {
      campoData = el('select', { 'aria-label': `Data de ${it.numero}` }, ...it.datasEncontradas.map((d) => el('option', { value: d }, formatarDataBR(d))));
      campoData.value = it.dataEntrada;
      campoData.addEventListener('change', () => { it.dataEntrada = campoData.value; });
    } else {
      campoData = el('input', { type: 'text', size: 16, class: 'num', value: it.dataEntrada ? formatarDataBR(it.dataEntrada) : '', placeholder: 'dd/mm/aaaa hh:mm', 'aria-label': `Data de ${it.numero}` });
      campoData.addEventListener('change', () => {
        const d = lerData(campoData.value);
        if (campoData.value.trim() && !d) { avisar('Data não reconhecida. Use dd/mm/aaaa hh:mm.', 'erro'); return; }
        it.dataEntrada = d;
        renderizarPrevia();
      });
    }
    const tarefa = el('input', { type: 'text', value: it.tarefa, size: 22, 'aria-label': `Tarefa de ${it.numero}` });
    tarefa.addEventListener('change', () => { it.tarefa = tarefa.value.trim(); });
    const sugestoes = [];
    if (it.sugestoesPreferencia.length) sugestoes.push(el('div', { class: 'sugestao' }, 'Prioridade? ' + it.sugestoesPreferencia.map(rotuloPreferencia).join(', ')));
    if (it.sugestaoSigiloso) sugestoes.push(el('div', { class: 'sugestao' }, 'Sigilo?'));
    const situacao = [];
    if (!it.dataEntrada) situacao.push(el('span', { class: 'selo alerta' }, 'Sem data'));
    if (it.datasEncontradas.length > 1) situacao.push(el('span', { class: 'selo alerta' }, 'Várias datas: confira'));
    if (it.jaNaFila) situacao.push(el('span', { class: 'selo' }, 'Já está na fila'));
    if (!situacao.length) situacao.push(el('span', { class: 'selo ok' }, 'Reconhecido'));
    corpo.append(el('tr', {},
      el('td', {}, chk),
      el('td', { class: 'num' }, it.numero),
      el('td', {}, campoData),
      el('td', {}, tarefa),
      el('td', { class: 'pequeno' }, it.etiquetas.join(', ')),
      el('td', {}, ...sugestoes),
      el('td', {}, ...situacao)));
    if (idx === 0) chk.dataset.primeiro = '1';
  });
  const n = pv.itens.filter((i) => i.incluir).length;
  $('#bt-aceitar-previa').textContent = 'Aceitar e incluir na fila';
  $('#bt-aceitar-previa').disabled = n === 0;
}

function aceitarPrevia() {
  const pv = estadoDist.previa;
  if (!pv) return;
  const mod = moduloAtual();
  const tarefaPadrao = $('#previa-tarefa-padrao').value.trim();
  const tipoPrazo228 = $('#previa-tipo-prazo').value;
  const tipoMinuta = $('#previa-tipo-minuta').value;
  const porNumero = new Map(mod.processos.map((p) => [p.numero, p]));
  let incluidos = 0, atualizados = 0, mantidos = 0;
  for (const it of pv.itens) {
    if (!it.incluir) continue;
    const existente = porNumero.get(it.numero);
    if (existente) {
      if (it.dataEntrada && (!existente.dataEntrada || it.dataEntrada < existente.dataEntrada)) { existente.dataEntrada = it.dataEntrada; atualizados++; }
      else mantidos++;
      continue;
    }
    const tarefa = it.tarefa || tarefaPadrao;
    const p = novoProcesso({
      numero: it.numero, dataEntrada: it.dataEntrada, tarefa, providencia: it.providencia || tarefa, etiquetas: it.etiquetas,
      sugestoesPreferencia: it.sugestoesPreferencia, sugestaoSigiloso: it.sugestaoSigiloso, tipoPrazo228,
      tipoMinuta: tipoMinuta === 'pela_tarefa' ? (tipoMinutaPelaTarefa(tarefa) || 'despacho') : tipoMinuta,
    }, estadoDist.modulo, { doParser: true });
    mod.processos.push(p);
    porNumero.set(p.numero, p);
    incluidos++;
  }
  estadoDist.previa = null;
  $('#previa').hidden = true;
  mod.resumo = '';
  renderizarTudo();
  const partes = [`${incluidos} processo(s) incluído(s)`];
  if (atualizados) partes.push(`${atualizados} já na fila com data atualizada para a mais antiga`);
  if (mantidos) partes.push(`${mantidos} já na fila e mantido(s)`);
  avisar(partes.join('; ') + '. Clique em "Distribuir a carga" para atribuir os novos.', 'ok');
}

function lerTabelaColada(texto) {
  const t = lerTabela(texto);
  if (!t.linhas.length) { avisar('Nenhuma linha encontrada na tabela.', 'erro'); return; }
  estadoDist.tabela = t;
  const cab = t.linhas[0];
  const mapa = estadoDist.config.perfilMapeamento
    ? aplicarPerfilMapeamento(estadoDist.config.perfilMapeamento, cab, Math.max(...t.linhas.map((l) => l.length)))
    : sugerirMapeamento(cab);
  if (estadoDist.config.perfilMapeamento) $('#chk-cabecalho').checked = !!estadoDist.config.perfilMapeamento.temCabecalho;
  renderizarMapeamento(mapa);
  $('#mapeamento').hidden = false;
}

function renderizarMapeamento(mapa) {
  const t = estadoDist.tabela;
  const ncol = Math.max(...t.linhas.map((l) => l.length));
  const cab = t.linhas[0];
  const alvo = limpar($('#mapa-campos'));
  for (const campo of CAMPOS_MAPEAMENTO) {
    const sel = el('select', { dataset: { campo: campo.chave } }, el('option', { value: -1 }, '(não usar)'));
    for (let i = 0; i < ncol; i++) {
      const nome = $('#chk-cabecalho').checked && cab[i] ? `${i + 1}: ${cab[i]}` : `Coluna ${i + 1} (ex.: ${String(cab[i] ?? '').slice(0, 18)})`;
      sel.append(el('option', { value: i }, nome));
    }
    const idx = Number.isInteger(mapa[campo.chave]) && mapa[campo.chave] < ncol ? mapa[campo.chave] : -1;
    sel.value = String(idx);
    alvo.append(el('label', { class: 'campo' }, el('span', {}, campo.rotulo + (campo.obrigatorio ? ' *' : '')), sel));
  }
}

function mapaAtual() {
  const mapa = {};
  $$('#mapa-campos select').forEach((s) => { mapa[s.dataset.campo] = s.value; });
  const ncol = estadoDist.tabela ? Math.max(...estadoDist.tabela.linhas.map((l) => l.length)) : 0;
  return normalizarMapa(mapa, ncol);
}

function aplicarMapeamentoAtual() {
  const t = estadoDist.tabela;
  if (!t) return;
  const mapa = mapaAtual();
  if (mapa.numero < 0) { avisar('Indique a coluna do número do processo.', 'erro'); return; }
  if (mapa.dataEntrada < 0) avisar('Sem coluna de data: os processos entram sem data e vão para o fim das listas.', 'erro');
  const temCabecalho = $('#chk-cabecalho').checked;
  estadoDist.config.perfilMapeamento = criarPerfilMapeamento(mapa, t.linhas[0], temCabecalho);
  abrirPrevia(aplicarMapeamento(t.linhas, mapa, { temCabecalho }));
}

function incluirManual() {
  const numero = $('#man-numero').value.trim();
  RE_CNJ.lastIndex = 0;
  if (!new RegExp(`^${RE_CNJ.source}$`).test(numero)) { avisar('Número fora do padrão CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO).', 'erro'); return; }
  const mod = moduloAtual();
  if (mod.processos.some((p) => p.numero === numero)) { avisar('Este processo já está na fila do módulo.', 'erro'); return; }
  const data = $('#man-data').value;
  const hora = $('#man-hora').value || '00:00';
  const dataEntrada = data ? lerData(`${data}T${hora}`) : null;
  const tarefa = $('#man-tarefa').value.trim();
  mod.processos.push(novoProcesso({
    numero, dataEntrada, tarefa, providencia: $('#man-providencia').value.trim() || tarefa, sigiloso: $('#man-sigiloso').checked,
  }, estadoDist.modulo));
  ['#man-numero', '#man-data', '#man-hora', '#man-tarefa', '#man-providencia'].forEach((s) => { $(s).value = ''; });
  $('#man-sigiloso').checked = false;
  renderizarTudo();
  avisar(dataEntrada ? 'Processo incluído.' : 'Processo incluído sem data: vai para o fim da lista.', 'ok');
}

// ---------- Servidores ----------

function adicionarServidor() {
  const nome = $('#novo-servidor').value.trim();
  const fator = Number($('#novo-fator').value);
  if (!nome) { avisar('Informe o nome curto do servidor.', 'erro'); return; }
  if (!(fator >= 10 && fator <= 100)) { avisar('O fator deve ficar entre 10% e 100%.', 'erro'); return; }
  const mod = moduloAtual();
  if (mod.servidores.some((s) => s.nome === nome)) { avisar('Já existe servidor com esse nome.', 'erro'); return; }
  mod.servidores.push({ nome, fator: fator / 100 });
  $('#novo-servidor').value = '';
  $('#novo-fator').value = '100';
  renderizarTudo();
}

function removerServidor(i) {
  const mod = moduloAtual();
  const s = mod.servidores[i];
  if (!s) return;
  if (!confirm(`Remover ${s.nome}? Os processos atribuídos a ele (não fixados) ficam sem responsável.`)) return;
  mod.servidores.splice(i, 1);
  for (const p of mod.processos) if (p.responsavel === s.nome && !p.responsavelFixado) p.responsavel = null;
  mod.resumo = '';
  renderizarTudo();
}

function distribuirCarga() {
  const mod = moduloAtual();
  recalcularPainel();
  const r = distribuir(estadoDist.painel.sequencia.map((e) => e.processo), mod.servidores);
  if (r.avisos.length && !r.atribuicoes.size) { avisar(r.avisos[0], 'erro'); return; }
  aplicarDistribuicao(mod.processos, r);
  mod.resumo = r.resumo;
  renderizarTudo();
  avisar('Carga distribuída. ' + r.resumo + (r.avisos.length ? ' Atenção: ' + r.avisos.join(' ') : ''), r.avisos.length ? 'erro' : 'ok');
}

// ---------- Edição do processo ----------

function abrirEdicao(numero) {
  const p = moduloAtual().processos.find((x) => x.numero === numero);
  if (!p) return;
  estadoDist.editando = numero;
  const gab = estadoDist.modulo === 'gabinete';
  const corpo = limpar($('#dlg-processo-corpo'));
  $('#dlg-processo-tit').textContent = `Processo ${p.numero}`;
  const partesData = p.dataEntrada ? partesISO(p.dataEntrada) : null;

  const servidores = normalizarServidores(moduloAtual().servidores).sort((a, b) => compararNomes(a.nome, b.nome));
  const selResp = el('select', { id: 'ed-responsavel' }, el('option', { value: '' }, '(sem responsável)'),
    ...servidores.map((s) => el('option', { value: s.nome }, s.nome)));
  if (p.responsavel && !servidores.some((s) => s.nome === p.responsavel)) selResp.append(el('option', { value: p.responsavel }, `${p.responsavel} (fora do cadastro)`));
  selResp.value = p.responsavel || '';

  const prefs = el('div', { class: 'linha' }, ...PREFERENCIAS_EDITAVEIS.map((k) =>
    el('label', {}, el('input', { type: 'checkbox', class: 'ed-pref', value: k, checked: p.preferencias.includes(k) }), ROTULOS_PREFERENCIA[k])));
  const outra = (p.preferencias.find((x) => String(x).startsWith('outra:')) || '').slice(6);

  anexar(corpo,
    el('fieldset', {}, el('legend', {}, 'Identificação'),
      el('div', { class: 'linha' },
        el('label', {}, el('input', { type: 'checkbox', id: 'ed-sigiloso', checked: p.sigiloso }), 'Sigiloso: mascarar o número em CSV e impressão'),
        p.sugestaoSigiloso && !p.sigiloso ? el('span', { class: 'sugestao' }, 'Sugestão do reconhecimento: possível sigilo. Confira.') : null),
      el('div', { class: 'linha' },
        el('label', { class: 'campo', style: 'flex:1 1 220px' }, el('span', {}, 'Tarefa (painel do PJe)'), el('input', { type: 'text', id: 'ed-tarefa', value: p.tarefa })),
        el('label', { class: 'campo', style: 'flex:1 1 220px' }, el('span', {}, 'Providência'), el('input', { type: 'text', id: 'ed-providencia', value: p.providencia }))),
      el('div', { class: 'linha' },
        el('label', { class: 'campo' }, el('span', {}, 'Data de entrada na tarefa'), el('input', { type: 'date', id: 'ed-data', value: partesData ? `${partesData.a}-${pad2(partesData.m)}-${pad2(partesData.d)}` : '' })),
        el('label', { class: 'campo' }, el('span', {}, 'Hora'), el('input', { type: 'time', id: 'ed-hora', value: partesData ? `${pad2(partesData.h)}:${pad2(partesData.mi)}` : '' })),
        el('label', { class: 'campo' }, el('span', {}, 'Prazo do art. 228'),
          el('select', { id: 'ed-prazo' }, ...Object.entries(ROTULOS_228).map(([k, v]) => el('option', { value: k }, v)))),
        gab ? el('label', { class: 'campo' }, el('span', {}, 'Tipo de minuta'),
          el('select', { id: 'ed-minuta' }, ...Object.entries(TIPOS_MINUTA).map(([k, v]) => el('option', { value: k }, v)))) : null)),
    el('fieldset', {}, el('legend', {}, 'Urgência reconhecida pelo juiz'),
      el('label', {}, el('input', { type: 'checkbox', id: 'ed-urgencia', checked: p.urgenciaJuiz.reconhecida }), 'O juiz reconheceu a urgência no pronunciamento'),
      el('label', { class: 'campo' }, el('span', {}, 'Referência do pronunciamento (ID no PJe) *'), el('input', { type: 'text', id: 'ed-urg-ref', value: p.urgenciaJuiz.referencia, placeholder: 'ex.: ID 123456789' })),
      el('p', { class: 'muted pequeno' }, 'Só o juiz reconhece urgência (CPC, art. 153, § 2º, I). A ferramenta não sugere urgência.')),
    el('fieldset', {}, el('legend', {}, gab ? 'Preferências legais e meta do CNJ' : 'Preferências legais (CPC, art. 1.048)'),
      p.sugestoesPreferencia.length ? el('p', { class: 'sugestao' }, 'Sugestão do reconhecimento: ' + p.sugestoesPreferencia.map(rotuloPreferencia).join(', ') + '. Confirme à vista da prova da condição.') : null,
      prefs,
      el('label', { class: 'campo' }, el('span', {}, 'Outra preferência legal (descreva)'), el('input', { type: 'text', id: 'ed-pref-outra', value: outra })),
      el('label', {}, el('input', { type: 'checkbox', id: 'ed-pref-confirmada', checked: p.preferenciaConfirmada }), 'Preferência confirmada pelo servidor à vista da prova da condição (art. 1.048, § 4º)'),
      gab ? el('div', {}, el('label', {}, el('input', { type: 'checkbox', id: 'ed-meta', checked: p.metaCNJ }), 'Meta do CNJ (art. 12, § 2º, VII)')) : null,
      el('label', { class: 'campo' }, el('span', {}, 'Ordem definida pelo juiz entre preferências concorrentes'),
        el('input', { type: 'number', id: 'ed-ordem-juiz', min: 1, step: 1, style: 'width:6rem', value: Number.isInteger(p.ordemDefinidaPeloJuiz) ? p.ordemDefinidaPeloJuiz : '' })),
      el('p', { class: 'muted pequeno' }, 'Preencha só quando o juiz tiver definido a ordem entre preferências concorrentes (CNJ, PP 0005150-49.2024.2.00.0000). Em branco, vale a antiguidade.')),
    el('fieldset', {}, el('legend', {}, 'Responsável'),
      el('div', { class: 'linha' }, selResp,
        el('label', {}, el('input', { type: 'checkbox', id: 'ed-fixado', checked: p.responsavelFixado }), 'Fixar responsável (a distribuição mantém)'))),
    el('label', { class: 'campo' }, el('span', {}, 'Observação'), el('textarea', { id: 'ed-obs', rows: 2 }, p.observacao)),
    el('div', { id: 'ed-erros' }),
  );
  $('#ed-prazo').value = p.tipoPrazo228;
  if (gab) $('#ed-minuta').value = p.tipoMinuta || 'despacho';
  abrirDialogo('dlg-processo');
}

function salvarEdicao() {
  const p = moduloAtual().processos.find((x) => x.numero === estadoDist.editando);
  if (!p) return;
  const erros = [];
  const urg = $('#ed-urgencia').checked;
  const ref = $('#ed-urg-ref').value.trim();
  if (urg && !ref) erros.push('Informe a referência do pronunciamento em que o juiz reconheceu a urgência.');
  const prefs = $$('.ed-pref').filter((c) => c.checked).map((c) => c.value);
  const outra = $('#ed-pref-outra').value.trim();
  if (outra) prefs.push('outra:' + outra);
  const confirmada = $('#ed-pref-confirmada').checked;
  if (confirmada && !prefs.length) erros.push('Marque ao menos uma preferência para confirmar.');
  const ordemTxt = $('#ed-ordem-juiz').value.trim();
  const ordem = ordemTxt ? Number(ordemTxt) : null;
  if (ordemTxt && !(Number.isInteger(ordem) && ordem >= 1)) erros.push('A ordem definida pelo juiz deve ser um número inteiro a partir de 1.');
  const data = $('#ed-data').value;
  const hora = $('#ed-hora').value || '00:00';
  const original = p.dataEntrada ? partesISO(p.dataEntrada) : null;
  const inalterada = original && data === `${original.a}-${pad2(original.m)}-${pad2(original.d)}` && hora === `${pad2(original.h)}:${pad2(original.mi)}`;
  const dataEntrada = inalterada ? p.dataEntrada : (data ? lerData(`${data}T${hora}`) : null);
  if (erros.length) {
    mostrarErros($('#ed-erros'), erros);
    return;
  }
  p.sigiloso = $('#ed-sigiloso').checked;
  p.tarefa = $('#ed-tarefa').value.trim();
  p.providencia = $('#ed-providencia').value.trim();
  p.dataEntrada = dataEntrada;
  p.tipoPrazo228 = $('#ed-prazo').value;
  if (estadoDist.modulo === 'gabinete') { p.tipoMinuta = $('#ed-minuta').value; p.metaCNJ = $('#ed-meta').checked; }
  p.urgenciaJuiz = { reconhecida: urg, referencia: ref };
  p.preferencias = prefs;
  p.preferenciaConfirmada = confirmada && prefs.length > 0;
  p.ordemDefinidaPeloJuiz = ordem;
  p.responsavel = $('#ed-responsavel').value || null;
  p.responsavelFixado = $('#ed-fixado').checked && !!p.responsavel;
  p.observacao = $('#ed-obs').value;
  p.sugestoesRevisadas = true;
  fecharDialogo('dlg-processo');
  renderizarTudo();
  avisar('Processo atualizado.', 'ok');
}

function removerProcesso() {
  const mod = moduloAtual();
  const i = mod.processos.findIndex((x) => x.numero === estadoDist.editando);
  if (i < 0) return;
  if (!confirm('Remover este processo da fila? (Nada muda no PJe.)')) return;
  mod.processos.splice(i, 1);
  fecharDialogo('dlg-processo');
  renderizarTudo();
}

// ---------- Exportação e impressão ----------

function nomeListaAtual() {
  if (estadoDist.lista === 'todas') return 'Todas as listas em sequência';
  if (estadoDist.lista === 'servidor') return `Fila de ${estadoDist.servidorFila || '(sem servidor)'}`;
  return ROTULOS_LISTA[estadoDist.lista];
}

function exportarCSV(entradas, sufixo) {
  const csv = csvPainel(entradas, { modoContagem: estadoDist.config.contagem.modo });
  baixarArquivo(`distribuidor_${estadoDist.modulo}_${sufixo}_${carimboArquivo()}.csv`, csv, 'text/csv;charset=utf-8');
}

function imprimirLista() {
  const entradas = entradasDaLista();
  const mod = MODULOS[estadoDist.modulo].rotulo;
  const tabela = el('table', {},
    el('thead', {}, el('tr', {}, ...['Ordem', 'Processo', 'Providência', 'Na fila desde', estadoDist.config.contagem.modo === 'corridos' ? 'Dias (corridos)' : 'Dias (úteis)', 'Lista', 'Responsável', 'Alerta'].map((t) => el('th', {}, t)))),
    el('tbody', {}, ...(entradas.length ? entradas.map((e) => el('tr', {},
      el('td', {}, String(e.ordemExibida)),
      el('td', { class: 'num' }, numeroPublico(e.processo)),
      el('td', {}, (estadoDist.modulo === 'gabinete' && e.processo.tipoMinuta ? TIPOS_MINUTA[e.processo.tipoMinuta] + ': ' : '') + (e.processo.providencia || e.processo.tarefa || '')),
      el('td', {}, formatarDataBR(e.processo.dataEntrada)),
      el('td', {}, e.dias ?? ''),
      el('td', {}, rotuloListaEntrada(e)),
      el('td', {}, e.processo.responsavel || ''),
      el('td', {}, e.alertas.join(' / '))))
      : [el('tr', {}, el('td', { colspan: 8 }, 'Nenhum processo.'))])));
  const no = el('div', {},
    el('div', { class: 'impressao-cab' },
      el('div', { class: 'pequeno' }, 'OAB/PA Subseção Marabá · Distribuidor de Tarefas da Serventia (protótipo)'),
      el('h1', {}, `${nomeListaAtual()} · Módulo ${mod}`),
      el('div', { class: 'pequeno' }, `Referência: ${formatarDataBR(referenciaAtual(), { hora: false })} · Impresso em ${formatarDataBR(agoraISO())} · ${entradas.length} processo(s)`),
      el('div', { class: 'pequeno' }, 'Regra de ordenação: ' + TEXTO_REGRA)),
    tabela,
    el('div', { class: 'impressao-rodape' }, TEXTO_RODAPE + ' ' + FRASE_MARCO_228 + ` Contagem em ${rotuloContagem()}. Números de processos sigilosos mascarados.`));
  imprimirConteudo(no);
}

// ---------- Configurações, perfil e sessão ----------

function abrirConfig() {
  const c = estadoDist.config;
  $$('input[name="modo-contagem"]').forEach((r) => { r.checked = r.value === c.contagem.modo; });
  $('#cfg-referencia').value = c.referencia ? c.referencia.slice(0, 10) : '';
  $('#cfg-feriados').value = feriadosParaTexto(c.contagem.feriados);
  $('#cfg-suspensoes').value = suspensoesParaTexto(c.contagem.suspensoes);
  $('#cfg-marco').textContent = FRASE_MARCO_228;
  limpar($('#cfg-erros'));
  abrirDialogo('dlg-config');
}

function aplicarConfig() {
  const f = lerFeriados($('#cfg-feriados').value);
  const s = lerSuspensoes($('#cfg-suspensoes').value);
  const erros = [...f.erros, ...s.erros];
  if (erros.length) {
    mostrarErros($('#cfg-erros'), erros);
    return;
  }
  const modo = $$('input[name="modo-contagem"]').find((r) => r.checked)?.value || 'uteis';
  const ref = $('#cfg-referencia').value;
  estadoDist.config.contagem = { modo, feriados: f.feriados, suspensoes: s.suspensoes };
  estadoDist.config.referencia = ref ? montarISO(...ref.split('-').map(Number)) : '';
  fecharDialogo('dlg-config');
  renderizarTudo();
  avisar('Configurações aplicadas.', 'ok');
}

function perfilAtual() {
  return { tipo: 'perfil-vara-distribuidor', versaoFormato: 1, salvoEm: agoraISO(), contagem: estadoDist.config.contagem, perfilMapeamento: estadoDist.config.perfilMapeamento };
}

function aplicarPerfil(dados) {
  if (!dados || (dados.tipo !== 'perfil-vara-distribuidor' && dados.tipo !== 'perfil-mapeamento')) throw new Error('Arquivo não é um perfil desta ferramenta.');
  if (dados.tipo === 'perfil-mapeamento') { estadoDist.config.perfilMapeamento = dados; return; }
  estadoDist.config.contagem = normalizarContagem(dados.contagem || {});
  if (dados.perfilMapeamento) estadoDist.config.perfilMapeamento = dados.perfilMapeamento;
}

function sessaoAtual() {
  return {
    tipo: 'sessao-distribuidor-tarefas',
    versaoFormato: 2,
    ferramenta: 'Distribuidor de Tarefas da Serventia __VERSAO__',
    salvoEm: agoraISO(),
    aviso: 'Arquivo de trabalho da vara. Contém números de processo: não compartilhe fora da unidade.',
    config: estadoDist.config,
    modulos: estadoDist.dados,
  };
}

function abrirSessaoDados(dados) {
  if (!dados || dados.tipo !== 'sessao-distribuidor-tarefas') throw new Error('Arquivo não é uma sessão do Distribuidor de Tarefas.');
  const novo = {};
  for (const m of Object.keys(MODULOS)) {
    const d = dados.modulos?.[m] || {};
    novo[m] = {
      processos: (Array.isArray(d.processos) ? d.processos : []).filter((p) => p && p.numero).map((p) => novoProcesso(p, m)),
      servidores: normalizarServidores(d.servidores || []),
      resumo: String(d.resumo || ''),
    };
  }
  estadoDist.dados = novo;
  if (dados.config) {
    aplicarPerfil({ tipo: 'perfil-vara-distribuidor', contagem: dados.config.contagem, perfilMapeamento: dados.config.perfilMapeamento });
    estadoDist.config.referencia = dados.config.referencia && lerData(dados.config.referencia) ? lerData(dados.config.referencia) : '';
  }
}

async function abrirJSON(acao) {
  const arq = await escolherArquivo('.json,application/json');
  if (!arq) return;
  try {
    const dados = JSON.parse(await lerArquivoTexto(arq));
    acao(dados);
    renderizarTudo();
    avisar('Arquivo aberto.', 'ok');
  } catch (e) {
    avisar('Não foi possível abrir: ' + e.message, 'erro');
  }
}

// ---------- Ligações ----------

function ligarEventosDistribuidor() {
  ligarFechamentoDialogos();
  ligarTamanhoFonte('bt-fonte-menos', 'bt-fonte-mais');
  ligarAbasTeclado($('.modulos [role=tablist]'), { manual: true });
  ligarAbasTeclado($('#cartao-entrada [role=tablist]'));
  ligarAbasTeclado($('#abas-listas'));
  atualizarAbas($('#cartao-entrada [role=tablist]'));
  $('#texto-regra').textContent = TEXTO_REGRA;
  $('#rodape').textContent = TEXTO_RODAPE;

  $$('[data-modulo]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.modulo === estadoDist.modulo) return;
    if (estadoDist.previa && !confirm('Há uma prévia ainda não aceita. Trocar de módulo e descartá-la?')) return;
    estadoDist.modulo = b.dataset.modulo;
    $('#previa-tipo-prazo').value = MODULOS[estadoDist.modulo].tipoPrazoPadrao;
    estadoDist.previa = null;
    $('#previa').hidden = true;
    prefGravar('distribuidor-modulo', estadoDist.modulo);
    renderizarTudo();
  }));
  $$('[data-entrada]').forEach((b) => b.addEventListener('click', () => mostrarEntrada(b.dataset.entrada)));
  $$('#abas-listas [data-lista]').forEach((b) => b.addEventListener('click', () => {
    estadoDist.lista = b.dataset.lista;
    prefGravar('distribuidor-lista', estadoDist.lista);
    renderizarLista();
  }));
  $('#sel-servidor-fila').addEventListener('change', (ev) => { estadoDist.servidorFila = ev.target.value; renderizarLista(); });

  $('#bt-reconhecer').addEventListener('click', () => {
    const texto = $('#txt-colar').value;
    if (!texto.trim()) { avisar('Cole a relação antes de reconhecer.', 'erro'); return; }
    abrirPrevia(reconhecerTextoLivre(texto));
  });
  $('#bt-exemplo').addEventListener('click', () => {
    $('#txt-colar').value = estadoDist.modulo === 'gabinete' ? EXEMPLO_GABINETE : EXEMPLO_SECRETARIA;
    avisar('Exemplo com dados fictícios carregado. Clique em "Reconhecer".');
  });
  $('#bt-limpar-colar').addEventListener('click', () => { $('#txt-colar').value = ''; });
  $('#bt-ler-tabela').addEventListener('click', () => lerTabelaColada($('#txt-tabela').value));
  $('#bt-exemplo-tabela').addEventListener('click', () => { $('#txt-tabela').value = EXEMPLO_GABINETE; lerTabelaColada(EXEMPLO_GABINETE); });
  $('#bt-importar-csv').addEventListener('click', async () => {
    const arq = await escolherArquivo('.csv,.tsv,.txt,text/csv,text/plain');
    if (!arq) return;
    const texto = await lerArquivoTexto(arq);
    $('#txt-tabela').value = texto;
    lerTabelaColada(texto);
  });
  $('#chk-cabecalho').addEventListener('change', () => { if (estadoDist.tabela) renderizarMapeamento(mapaAtual()); });
  $('#bt-aplicar-mapa').addEventListener('click', aplicarMapeamentoAtual);
  $('#bt-salvar-perfil-mapa').addEventListener('click', () => {
    if (!estadoDist.tabela) return;
    const perfil = criarPerfilMapeamento(mapaAtual(), estadoDist.tabela.linhas[0], $('#chk-cabecalho').checked);
    estadoDist.config.perfilMapeamento = perfil;
    baixarArquivo(`perfil-mapeamento_${carimboArquivo()}.json`, JSON.stringify(perfil, null, 2), 'application/json');
  });
  $('#bt-abrir-perfil-mapa').addEventListener('click', () => abrirJSON((d) => {
    aplicarPerfil(d.tipo === 'perfil-mapeamento' ? d : { ...d });
    if (estadoDist.tabela) {
      $('#chk-cabecalho').checked = !!estadoDist.config.perfilMapeamento?.temCabecalho;
      renderizarMapeamento(aplicarPerfilMapeamento(estadoDist.config.perfilMapeamento, estadoDist.tabela.linhas[0], Math.max(...estadoDist.tabela.linhas.map((l) => l.length))));
    }
  }));
  $('#bt-incluir-manual').addEventListener('click', incluirManual);
  $('#bt-descartar-previa').addEventListener('click', () => { estadoDist.previa = null; $('#previa').hidden = true; });
  $('#bt-aceitar-previa').addEventListener('click', aceitarPrevia);

  $('#bt-add-servidor').addEventListener('click', adicionarServidor);
  $('#novo-servidor').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') adicionarServidor(); });
  $('#bt-distribuir').addEventListener('click', distribuirCarga);

  $('#lista-corpo').addEventListener('click', (ev) => {
    const tr = ev.target.closest('tr[data-numero]');
    if (tr) abrirEdicao(tr.dataset.numero);
  });
  $('#bt-salvar-processo').addEventListener('click', salvarEdicao);
  $('#bt-remover-processo').addEventListener('click', removerProcesso);

  $('#bt-imprimir-lista').addEventListener('click', imprimirLista);
  $('#bt-csv-lista').addEventListener('click', () => exportarCSV(entradasDaLista(), estadoDist.lista === 'servidor' ? `fila-${estadoDist.servidorFila}` : estadoDist.lista));
  $('#bt-csv-completo').addEventListener('click', () => exportarCSV(estadoDist.painel.sequencia.map((e) => ({ ...e, ordemExibida: e.posicao })), 'completo'));
  $('#bt-limpar-modulo').addEventListener('click', () => {
    if (!confirm(`Esvaziar o módulo ${MODULOS[estadoDist.modulo].rotulo}? Processos e servidores deste módulo saem da ferramenta (nada muda no PJe). Salve a sessão antes, se precisar.`)) return;
    estadoDist.dados[estadoDist.modulo] = { processos: [], servidores: [], resumo: '' };
    renderizarTudo();
  });

  $('#bt-config').addEventListener('click', abrirConfig);
  $('#bt-aplicar-config').addEventListener('click', aplicarConfig);
  $('#bt-feriados-nacionais').addEventListener('click', () => {
    const atuais = lerFeriados($('#cfg-feriados').value).feriados;
    $('#cfg-feriados').value = feriadosParaTexto([...new Set([...atuais, ...FERIADOS_NACIONAIS_2026])].sort());
  });
  $('#bt-salvar-perfil').addEventListener('click', () => baixarArquivo(`perfil-vara_${carimboArquivo()}.json`, JSON.stringify(perfilAtual(), null, 2), 'application/json'));
  $('#bt-abrir-perfil').addEventListener('click', () => abrirJSON((d) => { aplicarPerfil(d); fecharDialogo('dlg-config'); }));
  $('#bt-sobre').addEventListener('click', () => abrirDialogo('dlg-sobre'));
  $('#bt-salvar-sessao').addEventListener('click', () => {
    baixarArquivo(`sessao-distribuidor_${carimboArquivo()}.json`, JSON.stringify(sessaoAtual(), null, 2), 'application/json');
    avisar('Sessão salva. Guarde o arquivo na pasta da vara e apague a cópia de Downloads: ele contém números de processo, inclusive de sigilosos.', 'ok');
  });
  $('#bt-abrir-sessao').addEventListener('click', () => {
    if (temDados() && !confirm('Abrir outra sessão substitui os dados atuais. Continuar?')) return;
    abrirJSON(abrirSessaoDados);
  });

  window.addEventListener('beforeunload', (ev) => {
    if (temDados()) { ev.preventDefault(); ev.returnValue = ''; }
  });

  const modSalvo = prefLer('distribuidor-modulo', 'secretaria');
  if (MODULOS[modSalvo]) estadoDist.modulo = modSalvo;
  const listaSalva = prefLer('distribuidor-lista', 'urgencia');
  if (['urgencia', 'preferencia', 'geral', 'todas', 'servidor'].includes(listaSalva)) estadoDist.lista = listaSalva;
  $('#previa-tipo-prazo').value = MODULOS[estadoDist.modulo].tipoPrazoPadrao;
  renderizarTudo();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligarEventosDistribuidor);
  else ligarEventosDistribuidor();
}
