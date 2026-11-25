// Distribuição da carga entre os servidores do módulo (seção 4.7 da instrução).
// Percorre a sequência já ordenada (urgentes, preferências, geral) e entrega cada processo ao servidor
// com a menor carga ponderada (atribuídos / fator). Empate: ordem alfabética do nome.
// Processo com responsável fixado mantém o responsável e entra na contagem.

const EPS = 1e-9;

export function normalizarServidores(servidores) {
  const vistos = new Set();
  const out = [];
  for (const s of servidores || []) {
    const nome = String(s.nome || '').trim();
    if (!nome || vistos.has(nome)) continue;
    let fator = Number(s.fator);
    if (!Number.isFinite(fator) || fator <= 0) fator = 1;
    vistos.add(nome);
    out.push({ nome, fator });
  }
  return out;
}

export function compararNomes(a, b) {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);
}

// sequencia: processos na ordem das três listas. Devolve { atribuicoes: Map(numero -> nome), contagem, resumo, avisos }.
export function distribuir(sequencia, servidores) {
  const ativos = normalizarServidores(servidores).sort((a, b) => compararNomes(a.nome, b.nome));
  const avisos = [];
  const atribuicoes = new Map();
  const carga = new Map(ativos.map((s) => [s.nome, 0]));
  if (!ativos.length) {
    avisos.push('Cadastre ao menos um servidor para distribuir.');
    return { atribuicoes, contagem: {}, resumo: '', avisos };
  }
  for (const p of sequencia) {
    if (p.responsavelFixado && p.responsavel && carga.has(p.responsavel)) {
      carga.set(p.responsavel, carga.get(p.responsavel) + 1);
    }
  }
  for (const p of sequencia) {
    if (p.responsavelFixado && p.responsavel) {
      atribuicoes.set(p.numero, p.responsavel);
      if (!carga.has(p.responsavel)) avisos.push(`${p.numero}: responsável fixado (${p.responsavel}) não está no cadastro.`);
      continue;
    }
    let escolhido = ativos[0];
    let menor = carga.get(escolhido.nome) / escolhido.fator;
    for (let i = 1; i < ativos.length; i++) {
      const s = ativos[i];
      const c = carga.get(s.nome) / s.fator;
      if (c < menor - EPS) { escolhido = s; menor = c; }
    }
    atribuicoes.set(p.numero, escolhido.nome);
    carga.set(escolhido.nome, carga.get(escolhido.nome) + 1);
  }
  const contagem = {};
  for (const s of ativos) contagem[s.nome] = carga.get(s.nome);
  const resumo = ativos.map((s) => `${s.nome}: ${contagem[s.nome]}`).join(' · ');
  return { atribuicoes, contagem, resumo, avisos };
}

export function aplicarDistribuicao(processos, resultado) {
  for (const p of processos) {
    if (resultado.atribuicoes.has(p.numero)) p.responsavel = resultado.atribuicoes.get(p.numero);
  }
  return processos;
}

export function contarPorResponsavel(processos, servidores) {
  const ativos = normalizarServidores(servidores).sort((a, b) => compararNomes(a.nome, b.nome));
  const contagem = {};
  for (const s of ativos) contagem[s.nome] = 0;
  for (const p of processos) if (p.responsavel && p.responsavel in contagem) contagem[p.responsavel]++;
  return { contagem, resumo: ativos.map((s) => `${s.nome}: ${contagem[s.nome]}`).join(' · ') };
}
