import { buscarInciso } from './catalogo-prov-006-2006.js';
import { modeloValidado, problemasDoModelo, incisoHabilitado } from './modelos.js';
import { formatarDataBR } from '../comum/datas.js';
import { paraCSV } from '../comum/exporta.js';

// Fecho obrigatório (Provimento nº 006/2006-CJRMB, art. 2º), inserido pelo gerador e não editável.
export const FECHO_ATO = 'Ato praticado com fundamento no art. 1º, § 2º, inciso {{inciso}}, do Provimento nº 006/2006-CJRMB, aplicável às Comarcas do Interior por força do Provimento nº 006/2009-CJCI, e no art. 203, § 4º, do CPC.';
export const TARJA_RASCUNHO = 'MODELO NÃO VALIDADO PELO JUÍZO';
export const LEMBRETE_BERNA = 'Só entra no lote o processo lido e etiquetado pelo servidor, como orienta o FAQ das etiquetas BERNA da Secretaria de Informática do TJPA.';
export const AVISO_NAO_LIDO = 'Não lido: fica fora do lote';

export function fecho(inciso) {
  return FECHO_ATO.replace('{{inciso}}', inciso);
}

export function sugerirEtiqueta(inciso) {
  return `LOTE ${inciso} · REVISADO`;
}

export function substituirVariaveis(texto, vars) {
  return String(texto).replace(/\{\{\s*(numero|prazo|data|servidor)\s*\}\}/g, (_, v) => {
    const val = vars[v];
    return val === undefined || val === null || val === '' ? `[${v}]` : String(val);
  });
}

export function textoDoAto(modelo, { numero, data, servidor }) {
  const corpo = substituirVariaveis(modelo.texto, { numero, prazo: modelo.prazo, data, servidor }).trim();
  return `${corpo}\n\n${fecho(modelo.inciso)}`;
}

// Prévia: funciona com qualquer modelo; rascunho recebe a tarja.
export function gerarPrevia(modelo, { numero = '', data = '', servidor = '' } = {}) {
  if (!modelo) return { texto: '', tarja: null };
  return {
    texto: textoDoAto(modelo, { numero: numero || '[número do processo]', data, servidor }),
    tarja: modeloValidado(modelo) ? null : TARJA_RASCUNHO,
  };
}

export function processosLidos(processos) {
  return (processos || []).filter((p) => p && p.lido === true);
}

// Motivos que impedem gerar o lote. Lista vazia = pode gerar.
export function impedimentosDoLote({ modelo, processos, servidor, modelos }) {
  const motivos = [];
  if (!modelo) motivos.push('Escolha um modelo.');
  else {
    if (!modeloValidado(modelo)) motivos.push('O modelo não está validado pelo juízo.');
    problemasDoModelo(modelo).forEach((p) => motivos.push(p));
    if (!incisoHabilitado(buscarInciso(modelo.inciso), modelos || [modelo])) motivos.push('Inciso marcado para revisão de aplicabilidade com o juízo.');
  }
  if (!processosLidos(processos).length) motivos.push('Marque ao menos um processo como lido individualmente.');
  if (!String(servidor || '').trim()) motivos.push('Informe o servidor responsável pelo lote.');
  return [...new Set(motivos)];
}

// Gera os atos do lote. Processo sem "Lido individualmente" nunca entra.
export function gerarLote({ modelo, processos, servidor, dataHora, modelos }) {
  const impedimentos = impedimentosDoLote({ modelo, processos, servidor, modelos });
  if (impedimentos.length) return { ok: false, impedimentos };
  const data = formatarDataBR(dataHora, { hora: false });
  const lidos = processosLidos(processos);
  const excluidos = (processos || []).filter((p) => p && p.lido !== true).map((p) => p.numero);
  const atos = lidos.map((p) => ({ numero: p.numero, texto: textoDoAto(modelo, { numero: p.numero, data, servidor }) }));
  const identicos = atos.every((a) => a.texto === atos[0].texto);
  const registro = {
    dataHora,
    servidor: String(servidor).trim(),
    inciso: modelo.inciso,
    modeloId: modelo.id,
    modeloTitulo: modelo.titulo,
    versaoModelo: modelo.versao,
    validadoPor: modelo.validadoPor,
    processos: lidos.map((p) => p.numero),
  };
  return {
    ok: true,
    atos,
    textoUnico: identicos && atos.length ? atos[0].texto : null,
    excluidos,
    registro,
    etiqueta: sugerirEtiqueta(modelo.inciso),
  };
}

export function textoArquivoLote(lote) {
  const r = lote.registro;
  const cab = [
    `Lote de atos ordinatórios · inciso ${r.inciso} do art. 1º, § 2º, do Provimento nº 006/2006-CJRMB`,
    `Modelo: ${r.modeloTitulo || r.modeloId} (versão ${r.versaoModelo}, validado por ${r.validadoPor || 'não informado'})`,
    `Servidor: ${r.servidor} · Gerado em ${formatarDataBR(r.dataHora)}`,
    `Processos: ${lote.atos.length}`,
    '',
  ];
  const corpo = lote.atos.map((a) => `Processo ${a.numero}\n\n${a.texto}\n`).join('\n----------------------------------------\n\n');
  return cab.join('\n') + '\n' + corpo;
}

export function csvRelacaoLote(lote) {
  const r = lote.registro;
  return paraCSV(
    ['Processo', 'Inciso', 'Modelo', 'Versão do modelo', 'Servidor', 'Data e hora'],
    r.processos.map((n) => [n, r.inciso, r.modeloTitulo || r.modeloId, r.versaoModelo, r.servidor, formatarDataBR(r.dataHora)]),
  );
}

// Registro de auditoria local (seção 5.7): uma linha por processo de cada geração.
export function csvAuditoria(registros) {
  const linhas = [];
  for (const r of registros || []) {
    for (const n of r.processos) {
      linhas.push([formatarDataBR(r.dataHora), r.servidor, r.inciso, r.modeloId, r.modeloTitulo || '', r.versaoModelo, r.validadoPor || '', n]);
    }
  }
  return paraCSV(['Data e hora', 'Servidor', 'Inciso', 'ID do modelo', 'Modelo', 'Versão do modelo', 'Validado por', 'Processo'], linhas);
}
