import { prefLer, prefGravar } from './exporta.js';

// Utilitários de interface compartilhados pelas duas ferramentas (somente navegador).

export function $(sel, raiz = document) {
  return raiz.querySelector(sel);
}

export function $$(sel, raiz = document) {
  return [...raiz.querySelectorAll(sel)];
}

// Cria elemento: el('button', { class: 'x', onclick: fn }, 'texto', filho...)
export function el(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k === 'value') e.value = v;
    else if (k === 'checked') e.checked = !!v;
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, String(v));
  }
  for (const f of filhos.flat()) {
    if (f === null || f === undefined || f === false) continue;
    e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return e;
}

// Anexa filhos ignorando null, undefined e false (o append nativo escreveria "null").
export function anexar(no, ...filhos) {
  for (const f of filhos.flat()) {
    if (f === null || f === undefined || f === false) continue;
    no.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return no;
}

export function limpar(no) {
  while (no.firstChild) no.removeChild(no.firstChild);
  return no;
}

let temporizadorAviso = null;
// Duas regiões persistentes: uma para status (educada) e outra para erro (alerta). O papel nunca muda.
function regiaoAviso(id, papel) {
  let r = document.getElementById(id);
  if (!r) {
    r = el('div', { id, role: papel, 'aria-live': papel === 'alert' ? 'assertive' : 'polite', class: 'aviso-flutuante', hidden: true });
    document.body.append(r);
  }
  return r;
}

export function avisar(mensagem, tipo = 'info') {
  const erro = tipo === 'erro';
  const caixa = regiaoAviso(erro ? 'aviso-flutuante-erro' : 'aviso-flutuante', erro ? 'alert' : 'status');
  const outra = document.getElementById(erro ? 'aviso-flutuante' : 'aviso-flutuante-erro');
  if (outra) outra.hidden = true;
  caixa.className = `aviso-flutuante ${tipo}`;
  caixa.textContent = mensagem;
  caixa.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { caixa.hidden = true; }, erro ? 12000 : 4000);
}

// Caixa de erros anunciada ao leitor de tela e com foco (WCAG 3.3.1).
export function mostrarErros(alvo, erros) {
  limpar(alvo);
  if (!erros || !erros.length) return;
  const caixa = el('div', { class: 'alerta-caixa', role: 'alert', tabindex: -1 },
    el('strong', {}, 'Corrija antes de salvar:'), ...erros.map((e) => el('div', {}, e)));
  alvo.append(caixa);
  caixa.focus();
}

// Abas: só a aba selecionada entra no Tab; as setas trocam de aba (padrão ARIA de abas).
export function atualizarAbas(lista) {
  if (!lista) return;
  for (const t of lista.querySelectorAll('[role=tab]')) t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
}

// manual: true faz as setas só moverem o foco; a aba é ativada com Enter ou Espaço.
export function ligarAbasTeclado(lista, { manual = false } = {}) {
  if (!lista) return;
  lista.addEventListener('keydown', (ev) => {
    const abas = [...lista.querySelectorAll('[role=tab]')];
    const i = abas.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (ev.key === 'ArrowRight') j = (i + 1) % abas.length;
    else if (ev.key === 'ArrowLeft') j = (i - 1 + abas.length) % abas.length;
    else if (ev.key === 'Home') j = 0;
    else if (ev.key === 'End') j = abas.length - 1;
    if (j === null) return;
    ev.preventDefault();
    if (manual) { abas.forEach((t) => { t.tabIndex = t === abas[j] ? 0 : -1; }); abas[j].focus(); return; }
    abas[j].click();
    abas[j].focus();
  });
}

export function abrirDialogo(id) {
  const d = document.getElementById(id);
  if (d && typeof d.showModal === 'function') d.showModal();
  else if (d) d.setAttribute('open', '');
}

export function fecharDialogo(id) {
  const d = document.getElementById(id);
  if (d && typeof d.close === 'function') d.close();
  else if (d) d.removeAttribute('open');
}

// Botões com data-fechar="id" fecham o diálogo correspondente.
export function ligarFechamentoDialogos() {
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-fechar]');
    if (b) fecharDialogo(b.dataset.fechar);
  });
}

// Tamanho da fonte: preferência de interface, guardada em localStorage (sem dados de processo).
export function ligarTamanhoFonte(idMenos, idMais) {
  let escala = Number(prefLer('fonte', 100)) || 100;
  const aplicar = () => { document.documentElement.style.fontSize = `${escala}%`; prefGravar('fonte', escala); };
  aplicar();
  document.getElementById(idMenos)?.addEventListener('click', () => { escala = Math.max(80, escala - 10); aplicar(); });
  document.getElementById(idMais)?.addEventListener('click', () => { escala = Math.min(150, escala + 10); aplicar(); });
}

export function escolherArquivo(aceitar = '.json') {
  return new Promise((resolve) => {
    const i = el('input', { type: 'file', accept: aceitar, hidden: true });
    i.addEventListener('change', () => { resolve(i.files && i.files[0] ? i.files[0] : null); i.remove(); });
    document.body.append(i);
    i.click();
  });
}

// Imprime apenas o conteúdo montado na área de impressão.
export function imprimirConteudo(no) {
  const area = document.getElementById('area-impressao');
  limpar(area).append(no);
  document.body.classList.add('imprimindo');
  const fim = () => { document.body.classList.remove('imprimindo'); window.removeEventListener('afterprint', fim); };
  window.addEventListener('afterprint', fim);
  window.print();
  setTimeout(fim, 1000);
}
