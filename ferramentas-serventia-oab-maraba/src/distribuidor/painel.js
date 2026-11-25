import { organizarFilas, ALERTA_CONCORRENCIA, ROTULOS_LISTA_CURTOS, rotuloPreferencia } from './ordenacao.js';
import { avaliarPrazo228, prepararContagem } from '../comum/prazos.js';
import { formatarDataBR } from '../comum/datas.js';
import { numeroPublico } from '../comum/mascara.js';
import { paraCSV } from '../comum/exporta.js';

export const FRASE_MARCO_228 = 'A data considerada é a de entrada na tarefa do PJe, usada como aproximação do marco do art. 228 do CPC.';
export const TEXTO_REGRA = '1º urgência reconhecida pelo juiz · 2º preferências legais por antiguidade · 3º lista geral por antiguidade (CPC, arts. 12 e 153).';
export const TEXTO_RODAPE = 'Entrada: relação copiada do painel de tarefas do PJe pelo próprio servidor. Nenhum dado sai do computador da vara.';

// Junta ordenação, prazos do art. 228 e alertas. Não altera os processos.
export function montarPainel(processos, { modulo, referencia, contagem, servidores = [] }) {
  const filas = organizarFilas(processos, modulo);
  const cfg = prepararContagem(contagem);
  const nomes = new Set((servidores || []).map((s) => String(s.nome || '').trim()).filter(Boolean));
  const contadores = { urgencia: filas.urgencia.length, preferencia: filas.preferencia.length, geral: filas.geral.length, acimaPrazo: 0, concorrentes: 0, total: processos.length };
  for (const e of filas.sequencia) {
    const p = e.processo;
    const prazo = avaliarPrazo228(p, referencia, cfg);
    e.dias = prazo.dias;
    e.prazo = prazo;
    e.alertas = [];
    if (e.lista === 'urgencia' && !String(p.urgenciaJuiz.referencia || '').trim()) e.alertas.push('Urgência sem referência do pronunciamento');
    if (e.concorrente) { e.alertas.push(ALERTA_CONCORRENCIA); contadores.concorrentes++; }
    if (prazo.vencido) { e.alertas.push(prazo.alerta); contadores.acimaPrazo++; }
    if (!p.dataEntrada) e.alertas.push('Sem data de entrada');
    if (!p.preferenciaConfirmada && (p.preferencias || []).length) {
      e.alertas.push('Preferência sugerida: confirmar (' + p.preferencias.map(rotuloPreferencia).join(', ') + ')');
    }
    if (p.sugestaoSigiloso && !p.sigiloso) e.alertas.push('Possível sigilo: conferir');
    if (p.responsavelFixado && p.responsavel && !nomes.has(p.responsavel)) e.alertas.push('Responsável fixado fora do cadastro');
  }
  return { ...filas, contadores };
}

export function rotuloListaEntrada(e) {
  if (e.lista === 'preferencia' && e.marcadores.length) {
    return `${ROTULOS_LISTA_CURTOS.preferencia}: ${e.marcadores.map(rotuloPreferencia).join(', ')}`;
  }
  return ROTULOS_LISTA_CURTOS[e.lista];
}

// Linhas para exportação pública: número de processo sigiloso sempre mascarado.
export function linhasExportacao(entradas, { modoContagem } = {}) {
  const cab = ['Ordem na lista', 'Sequência', 'Processo', 'Lista', 'Providência', 'Tarefa', 'Na fila desde',
    modoContagem === 'corridos' ? 'Dias (corridos)' : 'Dias (úteis)', 'Responsável', 'Alerta'];
  const linhas = entradas.map((e) => [
    e.ordem, e.posicao, numeroPublico(e.processo), rotuloListaEntrada(e), e.processo.providencia, e.processo.tarefa,
    formatarDataBR(e.processo.dataEntrada), e.dias ?? '', e.processo.responsavel || '', (e.alertas || []).join(' / '),
  ]);
  return { cab, linhas };
}

export function csvPainel(entradas, opcoes) {
  const { cab, linhas } = linhasExportacao(entradas, opcoes);
  return paraCSV(cab, linhas);
}
