// Modelo de dados do processo na fila (seção 4.3 da instrução).

export const MODULOS = Object.freeze({
  secretaria: { rotulo: 'Secretaria', tipoPrazoPadrao: 'ato_5dias' },
  gabinete: { rotulo: 'Gabinete', tipoPrazoPadrao: 'nenhum' },
});

export const TIPOS_MINUTA = Object.freeze({ despacho: 'Despacho', decisao: 'Decisão', sentenca: 'Sentença' });

// Tipo de minuta lido do nome da tarefa (ex.: "Minutar sentença"). É rótulo de organização, exibido e editável.
export function tipoMinutaPelaTarefa(tarefa) {
  const t = String(tarefa || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (t.includes('sentenc')) return 'sentenca';
  if (t.includes('decis')) return 'decisao';
  if (t.includes('despach')) return 'despacho';
  return null;
}

// doParser: true só quando o processo nasce do reconhecimento. Ao restaurar sessão, sugestões não viram preferência.
export function novoProcesso(dados = {}, modulo = 'secretaria', { doParser = false } = {}) {
  const mod = MODULOS[modulo] ? modulo : 'secretaria';
  const p = {
    numero: String(dados.numero || '').trim(),
    sigiloso: !!dados.sigiloso,
    modulo: mod,
    tarefa: String(dados.tarefa || ''),
    providencia: String(dados.providencia || dados.tarefa || ''),
    tipoPrazo228: ['conclusao_1dia', 'ato_5dias', 'nenhum'].includes(dados.tipoPrazo228)
      ? dados.tipoPrazo228 : MODULOS[mod].tipoPrazoPadrao,
    dataEntrada: dados.dataEntrada || null,
    urgenciaJuiz: {
      reconhecida: !!(dados.urgenciaJuiz && dados.urgenciaJuiz.reconhecida),
      referencia: String((dados.urgenciaJuiz && dados.urgenciaJuiz.referencia) || ''),
    },
    preferencias: Array.isArray(dados.preferencias) ? [...new Set(dados.preferencias)] : [],
    preferenciaConfirmada: !!dados.preferenciaConfirmada,
    sugestoesPreferencia: Array.isArray(dados.sugestoesPreferencia) ? [...dados.sugestoesPreferencia] : [],
    sugestaoSigiloso: !!dados.sugestaoSigiloso,
    sugestoesRevisadas: !!dados.sugestoesRevisadas,
    ordemDefinidaPeloJuiz: Number.isInteger(dados.ordemDefinidaPeloJuiz) ? dados.ordemDefinidaPeloJuiz : null,
    metaCNJ: mod === 'gabinete' ? !!dados.metaCNJ : false,
    tipoMinuta: mod === 'gabinete' && TIPOS_MINUTA[dados.tipoMinuta] ? dados.tipoMinuta : (mod === 'gabinete' ? 'despacho' : null),
    etiquetas: Array.isArray(dados.etiquetas) ? [...dados.etiquetas] : [],
    responsavel: dados.responsavel || null,
    responsavelFixado: !!dados.responsavelFixado,
    observacao: String(dados.observacao || ''),
  };
  // Sugestões do parser não viram preferência sozinhas: ficam guardadas até a confirmação.
  if (doParser && !p.preferencias.length && !p.preferenciaConfirmada && p.sugestoesPreferencia.length) {
    p.preferencias = [...p.sugestoesPreferencia];
  }
  return p;
}
