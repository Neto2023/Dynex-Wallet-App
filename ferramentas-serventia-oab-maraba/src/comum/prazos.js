import { diaSerial, diaDaSemana, lerData, formatarDataBR } from './datas.js';

// Prazos do serventuário (CPC, art. 228): 1 dia para remeter os autos conclusos e 5 dias para executar os atos.
// A forma de contagem (dias úteis ou corridos) é decisão do juízo. [PENDENTE] Padrão provisório: dias úteis.

export const LIMITES_228 = Object.freeze({
  conclusao_1dia: 1,
  ato_5dias: 5,
  nenhum: null,
});

export const ROTULOS_228 = Object.freeze({
  conclusao_1dia: 'Remessa à conclusão (1 dia)',
  ato_5dias: 'Execução de ato (5 dias)',
  nenhum: 'Sem prazo do art. 228',
});

export const CONTAGEM_PADRAO = Object.freeze({
  modo: 'uteis',
  feriados: [],      // ["2026-11-20", ...]
  suspensoes: [],    // [{ inicio: "2026-12-20", fim: "2027-01-20" }, ...]
});

// Normaliza a contagem vinda de perfil ou sessão: datas em dd/mm/aaaa ou ISO viram AAAA-MM-DD; o inválido sai.
export function normalizarContagem(c = {}) {
  const dia = (x) => { const d = lerData(x); return d ? d.slice(0, 10) : null; };
  const feriados = [...new Set((Array.isArray(c.feriados) ? c.feriados : []).map(dia).filter(Boolean))].sort();
  const suspensoes = (Array.isArray(c.suspensoes) ? c.suspensoes : [])
    .map((s) => ({ inicio: dia(s && s.inicio), fim: dia(s && s.fim) }))
    .filter((s) => s.inicio && s.fim);
  return { modo: c.modo === 'corridos' ? 'corridos' : 'uteis', feriados, suspensoes };
}

export function prepararContagem(config = {}) {
  const modo = config.modo === 'corridos' ? 'corridos' : 'uteis';
  const feriados = new Set();
  for (const f of config.feriados || []) {
    const s = diaSerial(f);
    if (s !== null) feriados.add(s);
  }
  const suspensoes = [];
  for (const p of config.suspensoes || []) {
    const i = diaSerial(p.inicio), f = diaSerial(p.fim);
    if (i !== null && f !== null) suspensoes.push([Math.min(i, f), Math.max(i, f)]);
  }
  return { modo, feriados, suspensoes };
}

function suspenso(serial, cfg) {
  return cfg.suspensoes.some(([i, f]) => serial >= i && serial <= f);
}

// Conta os dias a partir do dia seguinte ao da entrada até o dia de referência, inclusive.
// Dias úteis: exclui sábados, domingos, feriados cadastrados e períodos de suspensão.
// Dias corridos: conta todos os dias, exceto os períodos de suspensão cadastrados.
export function diasDecorridos(entradaIso, referenciaIso, config = CONTAGEM_PADRAO) {
  const ini = diaSerial(entradaIso);
  const fim = diaSerial(referenciaIso);
  if (ini === null || fim === null) return null;
  if (fim <= ini) return 0;
  const cfg = config && config.feriados instanceof Set ? config : prepararContagem(config);
  let n = 0;
  for (let s = ini + 1; s <= fim; s++) {
    if (suspenso(s, cfg)) continue;
    if (cfg.modo === 'uteis') {
      const wd = diaDaSemana(s);
      if (wd === 0 || wd === 6) continue;
      if (cfg.feriados.has(s)) continue;
    }
    n++;
  }
  return n;
}

// Avalia o processo contra o prazo do art. 228. É alerta de gestão: não calcula nem sugere sanção.
export function avaliarPrazo228(processo, referenciaIso, config = CONTAGEM_PADRAO) {
  const dias = processo.dataEntrada ? diasDecorridos(processo.dataEntrada, referenciaIso, config) : null;
  const limite = LIMITES_228[processo.tipoPrazo228] ?? null;
  const vencido = limite !== null && dias !== null && dias > limite;
  let alerta = null;
  if (vencido) alerta = limite === 1 ? 'Prazo de 1 dia vencido' : `Prazo de ${limite} dias vencido`;
  return { dias, limite, vencido, alerta };
}

// Lê a lista de feriados digitada (uma data por linha, dd/mm/aaaa). Texto após a data é ignorado.
export function lerFeriados(texto) {
  const feriados = [], erros = [];
  String(texto || '').split(/\r?\n/).forEach((linha, i) => {
    const t = linha.trim();
    if (!t) return;
    const iso = lerData(t.split(/\s+/)[0]);
    if (iso) feriados.push(iso.slice(0, 10));
    else erros.push(`Linha ${i + 1}: data não reconhecida (${t})`);
  });
  return { feriados: [...new Set(feriados)].sort(), erros };
}

// Uma suspensão por linha: "dd/mm/aaaa a dd/mm/aaaa" (ou uma única data).
export function lerSuspensoes(texto) {
  const suspensoes = [], erros = [];
  String(texto || '').split(/\r?\n/).forEach((linha, i) => {
    const t = linha.trim();
    if (!t) return;
    const datas = t.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/g) || [];
    const ini = datas[0] ? lerData(datas[0]) : null;
    const fim = datas[1] ? lerData(datas[1]) : ini;
    if (ini && fim) suspensoes.push({ inicio: ini.slice(0, 10), fim: fim.slice(0, 10) });
    else erros.push(`Linha ${i + 1}: período não reconhecido (${t})`);
  });
  return { suspensoes, erros };
}

export function feriadosParaTexto(feriados) {
  return (feriados || []).map((f) => formatarDataBR(f, { hora: false })).join('\n');
}

export function suspensoesParaTexto(suspensoes) {
  return (suspensoes || [])
    .map((s) => `${formatarDataBR(s.inicio, { hora: false })} a ${formatarDataBR(s.fim, { hora: false })}`)
    .join('\n');
}

// Feriados nacionais fixados em lei federal para 2026 (Leis 662/1949, 6.802/1980 e 14.759/2023).
// Não inclui feriados forenses, estaduais, municipais nem pontos facultativos: conferir com o calendário do TJPA.
export const FERIADOS_NACIONAIS_2026 = Object.freeze([
  '2026-01-01', '2026-04-21', '2026-05-01', '2026-09-07', '2026-10-12',
  '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
]);

