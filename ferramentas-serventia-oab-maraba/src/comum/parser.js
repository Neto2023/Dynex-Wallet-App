import { extrairDatas, lerData } from './datas.js';

// Parser tolerante da relação copiada do painel de tarefas do PJe.
// [PENDENTE] O formato exato da cópia do painel do TJPA não é conhecido: o parser trabalha por linha
// e por bloco (uma linha com número CNJ abre um bloco; as linhas seguintes sem número pertencem a ele).
// Tudo o que é inferido (prioridade, sigilo, tarefa) aparece como sugestão para o servidor confirmar.

export const RE_CNJ = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g;

export function normalizarBusca(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function extrairNumerosCNJ(texto) {
  return [...String(texto ?? '').matchAll(RE_CNJ)].map((m) => m[0]);
}

// Palavras-chave de prioridade (CPC, art. 1.048). Servem só para SUGERIR; o servidor confirma.
export const PALAVRAS_PREFERENCIA = Object.freeze({
  idoso: [/\bidos[oa]s?\b/, /\b60 anos\b/, /estatuto d[ao] (pessoa )?idos[oa]/, /\b10\.741\b/],
  doenca_grave: [/doencas? graves?/],
  eca: [/\beca\b/, /\bcrianca/, /\badolescente/, /infancia e (da )?juventude/, /\b8\.069\b/],
  violencia_domestica: [/violencia domestica/, /maria da penha/, /\b11\.340\b/],
  licitacao: [/\blicitac/, /\b14\.133\b/, /\b8\.666\b/, /contratac(ao|oes) publica/],
});

export function sugerirPreferencias(texto) {
  const t = normalizarBusca(texto);
  return Object.keys(PALAVRAS_PREFERENCIA).filter((k) => PALAVRAS_PREFERENCIA[k].some((re) => re.test(t)));
}

export function sugerirSigilo(texto) {
  return /segredo de justica|\bsigilos[oa]s?\b|\bsigilo\b/.test(normalizarBusca(texto));
}

export function extrairEtiquetas(texto) {
  const s = String(texto ?? '');
  const out = [];
  for (const m of s.matchAll(/etiquetas?\s*:\s*([^\n|\t]+)/gi)) {
    m[1].split(/[,;]/).forEach((e) => out.push(e.trim()));
  }
  for (const m of s.matchAll(/\[([^\]\n]{2,60})\]/g)) out.push(m[1].trim());
  return [...new Set(out.filter(Boolean))];
}

// Termos que costumam aparecer em nomes de tarefa do PJe. Um campo que contenha um deles é tratado
// como "tarefa". Campos sem esses termos (por exemplo, classe e nome das partes) são ignorados de propósito.
export const TERMOS_TAREFA = Object.freeze([
  'prazo decorrido', 'conclus', 'intima', 'expedi', 'minutar', 'minuta', 'despacho', 'decisao', 'sentenc',
  'cumprimento', 'cumprir', 'analisar', 'aguardar', 'certific', 'juntad', 'juntar', 'publica', 'arquiv',
  'triagem', 'citac', 'citar', 'remeter', 'encaminhar', 'elaborar', 'preparar', 'providencia', 'assinar',
  'audiencia', 'oficio', 'mandado', 'precatoria', 'retorno', 'diligencia', 'calculo', 'alvara',
]);

const SEPARADORES_CAMPO = /\t|\s\|\s|\||;|\s{2,}/;

function limparCampo(s) {
  return s.replace(RE_CNJ, ' ').replace(/\d{2}\/\d{2}\/\d{4}(\s*(,|às|as|-)?\s*\d{2}:\d{2}(:\d{2})?)?/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s:,.\-]+|[\s:,.\-]+$/g, '');
}

function rotulado(texto, rotulo) {
  const re = new RegExp(`${rotulo}\\s*:\\s*([^\\n|\\t;]+)`, 'i');
  const m = String(texto).match(re);
  return m ? m[1].trim() : '';
}

export function reconhecerTarefa(textoBloco) {
  const explicita = rotulado(textoBloco, 'tarefa');
  if (explicita) return limparCampo(explicita);
  for (const linha of String(textoBloco).split('\n')) {
    for (const campo of linha.split(SEPARADORES_CAMPO)) {
      if (/^\s*etiquetas?\s*:/i.test(campo)) continue;
      const c = limparCampo(campo);
      if (c.length < 3) continue;
      const n = normalizarBusca(c);
      if (TERMOS_TAREFA.some((t) => n.includes(t))) return c.slice(0, 120);
    }
  }
  return '';
}

function montarItem(numero, textoBloco, linhaOrigem) {
  const datas = extrairDatas(textoBloco);
  const datasEncontradas = [...new Set(datas.map((d) => d.iso))];
  return {
    numero,
    dataEntrada: datasEncontradas[0] || null,
    datasEncontradas,
    tarefa: reconhecerTarefa(textoBloco),
    providencia: rotulado(textoBloco, 'provid[eê]ncia'),
    etiquetas: extrairEtiquetas(textoBloco),
    sugestoesPreferencia: sugerirPreferencias(textoBloco),
    sugestaoSigiloso: sugerirSigilo(textoBloco),
    origem: textoBloco.trim().slice(0, 300),
    linhaOrigem,
  };
}

// Mantém a ocorrência mais antiga de cada número e avisa. Sem data conta como a mais recente.
export function deduplicar(itens) {
  const porNumero = new Map();
  const contagem = new Map();
  for (const it of itens) {
    contagem.set(it.numero, (contagem.get(it.numero) || 0) + 1);
    const atual = porNumero.get(it.numero);
    if (!atual) { porNumero.set(it.numero, it); continue; }
    const a = atual.dataEntrada, b = it.dataEntrada;
    if (b && (!a || b < a)) porNumero.set(it.numero, it);
  }
  const avisos = [];
  for (const [numero, n] of contagem) {
    if (n > 1) {
      const mantido = porNumero.get(numero);
      avisos.push({ numero, mensagem: `aparece ${n} vezes; mantida a ocorrência mais antiga`, dataMantida: mantido.dataEntrada });
    }
  }
  // preserva a ordem da primeira aparição
  const vistos = new Set();
  const unicos = [];
  for (const it of itens) {
    if (vistos.has(it.numero)) continue;
    vistos.add(it.numero);
    unicos.push(porNumero.get(it.numero));
  }
  return { itens: unicos, avisos };
}

function resumir(itens, ignorados) {
  const { itens: unicos, avisos } = deduplicar(itens);
  const incompletos = [];
  for (const it of unicos) {
    if (!it.dataEntrada) incompletos.push({ tipo: 'sem_data', numero: it.numero, trecho: it.origem, linha: it.linhaOrigem });
    if (it.datasEncontradas && it.datasEncontradas.length > 1) {
      incompletos.push({ tipo: 'varias_datas', numero: it.numero, trecho: it.origem, linha: it.linhaOrigem });
    }
  }
  for (const ig of ignorados) incompletos.push({ tipo: 'sem_numero', numero: null, trecho: ig.trecho, linha: ig.linha });
  return { itens: unicos, incompletos, avisos };
}

// Caminho 1: texto livre colado do painel.
export function reconhecerTextoLivre(texto) {
  const linhas = String(texto ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocos = [];
  const ignorados = [];
  let atual = null;
  linhas.forEach((linha, i) => {
    const nums = [...linha.matchAll(RE_CNJ)];
    if (!nums.length) {
      if (atual) atual.linhas.push(linha);
      else if (linha.trim()) ignorados.push({ linha: i + 1, trecho: linha.trim().slice(0, 200) });
      return;
    }
    nums.forEach((m, k) => {
      const ini = k === 0 ? 0 : m.index;
      const fim = k + 1 < nums.length ? nums[k + 1].index : linha.length;
      atual = { numero: m[0], linhas: [linha.slice(ini, fim)], linhaOrigem: i + 1 };
      blocos.push(atual);
    });
  });
  const itens = blocos.map((b) => montarItem(b.numero, b.linhas.join('\n'), b.linhaOrigem));
  return resumir(itens, ignorados);
}

// Caminho 2: tabela colada (TSV) ou CSV.
export function detectarSeparador(texto) {
  const primeira = String(texto ?? '').split(/\r?\n/).find((l) => l.trim()) || '';
  const cont = { '\t': 0, ';': 0, ',': 0 };
  let aspas = false;
  for (const ch of primeira) {
    if (ch === '"') aspas = !aspas;
    else if (!aspas && ch in cont) cont[ch]++;
  }
  if (cont['\t'] > 0) return '\t';
  return cont[';'] >= cont[','] && cont[';'] > 0 ? ';' : (cont[','] > 0 ? ',' : '\t');
}

export function lerTabela(texto, separador) {
  const s = String(texto ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const sep = separador || detectarSeparador(s);
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (aspas) {
      if (ch === '"') {
        if (s[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += ch;
      continue;
    }
    if (ch === '"' && campo === '') { aspas = true; continue; }
    if (ch === sep) { linha.push(campo); campo = ''; continue; }
    if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; continue; }
    campo += ch;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return { separador: sep, linhas: linhas.filter((l) => l.some((c) => c.trim() !== '')) };
}

export const CAMPOS_MAPEAMENTO = Object.freeze([
  { chave: 'numero', rotulo: 'Número do processo', obrigatorio: true },
  { chave: 'dataEntrada', rotulo: 'Data de entrada na tarefa', obrigatorio: true },
  { chave: 'tarefa', rotulo: 'Tarefa' },
  { chave: 'providencia', rotulo: 'Providência' },
  { chave: 'etiquetas', rotulo: 'Etiquetas' },
  { chave: 'prioridade', rotulo: 'Prioridade' },
]);

// Sugere o mapeamento pelo nome das colunas do cabeçalho.
export function sugerirMapeamento(cabecalho) {
  const mapa = {};
  const testes = {
    numero: /processo|numero|^n\s*\.?\s*[º°o]\s*$|^n\s*\.?\s*[º°]/,
    dataEntrada: /entrada|data|desde|recebid/,
    tarefa: /tarefa/,
    providencia: /providencia/,
    etiquetas: /etiqueta/,
    prioridade: /prioridade|preferencia/,
  };
  (cabecalho || []).forEach((col, idx) => {
    const n = normalizarBusca(col);
    for (const [chave, re] of Object.entries(testes)) {
      if (mapa[chave] === undefined && re.test(n)) { mapa[chave] = idx; break; }
    }
  });
  return mapa;
}

// Perfil de mapeamento: guarda o índice e o nome da coluna, para funcionar mesmo se as colunas mudarem de lugar.
export function criarPerfilMapeamento(mapa, cabecalho, temCabecalho) {
  const colunas = {};
  for (const [chave, idx] of Object.entries(mapa)) {
    if (idx === null || idx === undefined || idx < 0) continue;
    colunas[chave] = { indice: idx, nome: temCabecalho && cabecalho ? String(cabecalho[idx] ?? '') : '' };
  }
  return { tipo: 'perfil-mapeamento', versao: 1, temCabecalho: !!temCabecalho, colunas };
}

// Índice vazio, inválido ou fora da tabela vira -1 ("não usar"). Nunca cai na coluna 0 por acaso.
export function normalizarMapa(mapa, ncol) {
  const out = {};
  for (const [chave, v] of Object.entries(mapa || {})) {
    const n = v === '' || v === null || v === undefined ? NaN : Number(v);
    out[chave] = Number.isInteger(n) && n >= 0 && n < ncol ? n : -1;
  }
  return out;
}

export function aplicarPerfilMapeamento(perfil, cabecalho, ncol = (cabecalho || []).length) {
  const mapa = {};
  const nomes = (cabecalho || []).map((c) => normalizarBusca(c).trim());
  for (const [chave, col] of Object.entries(perfil?.colunas || {})) {
    const porNome = col.nome ? nomes.indexOf(normalizarBusca(col.nome).trim()) : -1;
    mapa[chave] = porNome >= 0 ? porNome : col.indice;
  }
  return normalizarMapa(mapa, ncol);
}

export function aplicarMapeamento(linhas, mapa, { temCabecalho = true } = {}) {
  const corpo = temCabecalho ? linhas.slice(1) : linhas;
  const desloc = temCabecalho ? 2 : 1;
  const cel = (l, chave) => {
    const idx = mapa[chave];
    return idx === undefined || idx === null || idx < 0 ? '' : String(l[idx] ?? '').trim();
  };
  const itens = [];
  const ignorados = [];
  corpo.forEach((l, i) => {
    const numeros = extrairNumerosCNJ(cel(l, 'numero'));
    if (!numeros.length) {
      ignorados.push({ linha: i + desloc, trecho: l.join(' | ').slice(0, 200) });
      return;
    }
    const data = lerData(cel(l, 'dataEntrada'));
    const prioridade = cel(l, 'prioridade');
    const etiquetas = cel(l, 'etiquetas').split(/[,;|]/).map((e) => e.trim()).filter(Boolean);
    itens.push({
      numero: numeros[0],
      dataEntrada: data,
      datasEncontradas: data ? [data] : [],
      tarefa: cel(l, 'tarefa'),
      providencia: cel(l, 'providencia'),
      etiquetas,
      sugestoesPreferencia: sugerirPreferencias(prioridade),
      sugestaoSigiloso: sugerirSigilo(prioridade),
      origem: l.join(' | ').slice(0, 300),
      linhaOrigem: i + desloc,
    });
  });
  return resumir(itens, ignorados);
}
