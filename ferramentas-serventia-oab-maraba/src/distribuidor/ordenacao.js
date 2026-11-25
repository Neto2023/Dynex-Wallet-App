// Regra de ordenação (seção 4.4 da instrução), implementada literalmente:
//   1. Urgência reconhecida pelo juiz, por antiguidade (CPC, art. 153, § 2º, I; art. 12, § 2º, IX).
//   2. Preferências legais: primeiro a ordem definida pelo juiz, se houver; os demais por antiguidade
//      (CPC, art. 1.048; art. 153, § 2º, II; art. 12, § 2º, VII).
//   3. Lista geral, por antiguidade.
// Entre tipos de preferência NÃO há hierarquia: a ordem entre preferências concorrentes é definida pelo
// magistrado no caso concreto (CNJ, PP 0005150-49.2024.2.00.0000). Por isso o código só compara datas
// e a ordem fixada pelo juiz, e sinaliza a concorrência para decisão.

export const LISTAS = Object.freeze(['urgencia', 'preferencia', 'geral']);

export const ROTULOS_LISTA = Object.freeze({
  urgencia: 'Urgência reconhecida pelo juiz',
  preferencia: 'Preferências legais',
  geral: 'Lista geral',
});

export const ROTULOS_LISTA_CURTOS = Object.freeze({ urgencia: 'Urgência', preferencia: 'Preferência', geral: 'Geral' });

export const ROTULOS_PREFERENCIA = Object.freeze({
  idoso: 'Idoso (60 anos ou mais)',
  doenca_grave: 'Doença grave',
  eca: 'ECA',
  violencia_domestica: 'Violência doméstica',
  licitacao: 'Licitação',
  meta_cnj: 'Meta do CNJ',
});

export const ALERTA_CONCORRENCIA = 'Preferências concorrentes: decisão do juiz';

export function rotuloPreferencia(chave) {
  if (String(chave).startsWith('outra:')) return String(chave).slice(6).trim() || 'Outra';
  return ROTULOS_PREFERENCIA[chave] || String(chave);
}

// Marcadores que levam o processo à lista 2. A meta do CNJ só existe no módulo Gabinete.
export function marcadoresPreferencia(p, modulo) {
  const m = p.preferenciaConfirmada ? [...new Set(p.preferencias || [])].filter(Boolean) : [];
  if (modulo === 'gabinete' && p.metaCNJ) m.push('meta_cnj');
  return m;
}

export function listaDoProcesso(p, modulo) {
  if (p.urgenciaJuiz && p.urgenciaJuiz.reconhecida === true) return 'urgencia';
  if (marcadoresPreferencia(p, modulo).length > 0) return 'preferencia';
  return 'geral';
}

// Antiguidade: data de entrada crescente; sem data vai para o fim; empate mantém a ordem de inclusão.
export function compararAntiguidade(a, b) {
  const da = a.dataEntrada || null, db = b.dataEntrada || null;
  if (da === db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da < db ? -1 : 1;
}

export function ordenarPorAntiguidade(lista) {
  return lista.slice().sort(compararAntiguidade);
}

function temOrdemDoJuiz(p) {
  return Number.isInteger(p.ordemDefinidaPeloJuiz);
}

export function ordenarPreferencias(lista) {
  const comOrdem = lista.filter(temOrdemDoJuiz)
    .sort((a, b) => (a.ordemDefinidaPeloJuiz - b.ordemDefinidaPeloJuiz) || compararAntiguidade(a, b));
  const demais = ordenarPorAntiguidade(lista.filter((p) => !temOrdemDoJuiz(p)));
  return [...comOrdem, ...demais];
}

// Processos que precisam de decisão do juiz sobre a ordem entre preferências:
//  a) processo com mais de uma preferência;
//  b) empate de data (mesmo dia) entre processos com preferências diferentes.
// Quem já tem ordem definida pelo juiz não recebe o alerta.
export function concorrentes(listaPreferencias, modulo) {
  const marcados = new Set();
  const semOrdem = listaPreferencias.filter((p) => !temOrdemDoJuiz(p));
  const porDia = new Map();
  for (const p of semOrdem) {
    const marcas = marcadoresPreferencia(p, modulo);
    if (marcas.length > 1) marcados.add(p);
    if (!p.dataEntrada) continue;
    const dia = p.dataEntrada.slice(0, 10);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push({ p, assinatura: marcas.slice().sort().join('|') });
  }
  for (const grupo of porDia.values()) {
    if (grupo.length < 2) continue;
    const assinaturas = new Set(grupo.map((g) => g.assinatura));
    if (assinaturas.size > 1) grupo.forEach((g) => marcados.add(g.p));
  }
  return marcados;
}

// Separa e ordena as três listas. Devolve entradas com a posição em cada lista.
export function organizarFilas(processos, modulo) {
  const separadas = { urgencia: [], preferencia: [], geral: [] };
  for (const p of processos) separadas[listaDoProcesso(p, modulo)].push(p);
  const ordenadas = {
    urgencia: ordenarPorAntiguidade(separadas.urgencia),
    preferencia: ordenarPreferencias(separadas.preferencia),
    geral: ordenarPorAntiguidade(separadas.geral),
  };
  const conc = concorrentes(ordenadas.preferencia, modulo);
  const resultado = { urgencia: [], preferencia: [], geral: [], sequencia: [] };
  let seq = 0;
  for (const lista of LISTAS) {
    ordenadas[lista].forEach((p, i) => {
      const entrada = {
        processo: p,
        lista,
        ordem: i + 1,
        posicao: ++seq,
        marcadores: marcadoresPreferencia(p, modulo),
        concorrente: lista === 'preferencia' && conc.has(p),
      };
      resultado[lista].push(entrada);
      resultado.sequencia.push(entrada);
    });
  }
  return resultado;
}
