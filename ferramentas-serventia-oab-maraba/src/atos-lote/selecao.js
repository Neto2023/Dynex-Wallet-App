import { buscarInciso } from './catalogo-prov-006-2006.js';

// Marcação "Lido individualmente" por inciso (achado C-01 da auditoria da v1).
// A leitura vale para a hipótese e para a etiqueta daquele inciso: trocar de inciso não aproveita leitura,
// e depois de gerado o lote a marcação é zerada (gerar de novo exige nova leitura).
// Estrutura do processo: { numero, lidos: { XV: true }, gerados: { XV: "2026-11-25T14:30:00" } }

export function lidoNoInciso(p, inciso) {
  return !!(p && p.lidos && Object.prototype.hasOwnProperty.call(p.lidos, inciso) && p.lidos[inciso] === true);
}

export function marcarLido(p, inciso, valor) {
  if (!buscarInciso(inciso)) return p;
  if (!p.lidos || typeof p.lidos !== 'object') p.lidos = {};
  if (valor) p.lidos[inciso] = true;
  else delete p.lidos[inciso];
  return p;
}

// Visão dos processos para o gerador: { numero, lido } do inciso escolhido.
export function processosDoInciso(processos, inciso) {
  return (processos || []).map((p) => ({ numero: p.numero, lido: lidoNoInciso(p, inciso) }));
}

export function geradoNoInciso(p, inciso) {
  return p && p.gerados && Object.prototype.hasOwnProperty.call(p.gerados, inciso) ? p.gerados[inciso] : null;
}

// Depois do lote: zera a leitura dos processos que entraram e registra a data da geração.
export function zerarLidos(processos, inciso, numeros, dataHora = null) {
  const alvo = numeros ? new Set(numeros) : null;
  for (const p of processos || []) {
    if (alvo && !alvo.has(p.numero)) continue;
    marcarLido(p, inciso, false);
    if (dataHora && buscarInciso(inciso)) {
      if (!p.gerados || typeof p.gerados !== 'object') p.gerados = {};
      p.gerados[inciso] = dataHora;
    }
  }
  return processos;
}

function copiarMapa(origem, aceitar) {
  const out = {};
  if (!origem || typeof origem !== 'object') return out;
  for (const k of Object.keys(origem)) if (buscarInciso(k) && aceitar(origem[k])) out[k] = origem[k];
  return out;
}

// Sessão da v2: só aceita incisos existentes e valores do tipo esperado.
// Números repetidos são unidos em uma linha só, somando leituras e gerações.
export function restaurarProcessos(lista) {
  const porNumero = new Map();
  for (const p of Array.isArray(lista) ? lista : []) {
    if (!p || typeof p.numero !== 'string') continue;
    const atual = porNumero.get(p.numero) || { numero: p.numero, lidos: {}, gerados: {} };
    Object.assign(atual.lidos, copiarMapa(p.lidos, (v) => v === true));
    Object.assign(atual.gerados, copiarMapa(p.gerados, (v) => typeof v === 'string'));
    porNumero.set(p.numero, atual);
  }
  return [...porNumero.values()];
}

// Sessão da v1 não diz para qual inciso cada leitura valeu: as marcações são descartadas.
export function migrarProcessosV1(lista) {
  const validos = (Array.isArray(lista) ? lista : []).filter((p) => p && typeof p.numero === 'string');
  return {
    processos: [...new Set(validos.map((p) => p.numero))].map((numero) => ({ numero, lidos: {}, gerados: {} })),
    descartados: validos.filter((p) => p.lido === true).length,
  };
}
