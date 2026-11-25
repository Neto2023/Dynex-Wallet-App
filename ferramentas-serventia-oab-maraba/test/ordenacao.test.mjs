import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { novoProcesso } from '../src/distribuidor/processo.js';
import { organizarFilas, ALERTA_CONCORRENCIA } from '../src/distribuidor/ordenacao.js';
import { montarPainel, csvPainel } from '../src/distribuidor/painel.js';

const P = (n, data, extra = {}, modulo = 'secretaria') =>
  novoProcesso({ numero: `${String(n).padStart(7, '0')}-01.2026.8.14.0028`, dataEntrada: data, ...extra }, modulo);
const nums = (lista) => lista.map((e) => Number(e.processo.numero.slice(0, 7)));

test('urgente mais novo fica à frente de preferência mais antiga', () => {
  const f = organizarFilas([
    P(1, '2026-10-01T10:00:00', { preferencias: ['idoso'], preferenciaConfirmada: true }),
    P(2, '2026-11-20T10:00:00', { urgenciaJuiz: { reconhecida: true, referencia: 'ID 123' } }),
  ], 'secretaria');
  assert.deepEqual(nums(f.sequencia), [2, 1]);
  assert.equal(f.sequencia[0].lista, 'urgencia');
});

test('preferência mais nova fica à frente de processo geral mais antigo', () => {
  const f = organizarFilas([
    P(1, '2026-01-01T10:00:00'),
    P(2, '2026-11-20T10:00:00', { preferencias: ['doenca_grave'], preferenciaConfirmada: true }),
  ], 'secretaria');
  assert.deepEqual(nums(f.sequencia), [2, 1]);
});

test('preferência só vale depois de confirmada', () => {
  const f = organizarFilas([P(1, '2026-11-20T10:00:00', { sugestoesPreferencia: ['idoso'] }), P(2, '2026-11-01T10:00:00')], 'secretaria');
  assert.equal(f.preferencia.length, 0);
  assert.deepEqual(nums(f.geral), [2, 1]);
});

test('urgência só entra com marcação manual', () => {
  const f = organizarFilas([P(1, '2026-11-20T10:00:00', { urgenciaJuiz: { reconhecida: false, referencia: 'ID 9' } })], 'secretaria');
  assert.equal(f.urgencia.length, 0);
});

test('preferências diferentes na mesma data: alerta e sem reordenar por tipo', () => {
  for (const [a, b] of [['idoso', 'eca'], ['eca', 'idoso'], ['licitacao', 'doenca_grave'], ['violencia_domestica', 'idoso']]) {
    const f = organizarFilas([
      P(1, '2026-11-10T15:00:00', { preferencias: [a], preferenciaConfirmada: true }),
      P(2, '2026-11-10T09:00:00', { preferencias: [b], preferenciaConfirmada: true }),
      P(3, '2026-11-10T09:00:00', { preferencias: [a], preferenciaConfirmada: true }),
    ], 'secretaria');
    // a ordem só depende da data e hora (e da ordem de inclusão no empate), nunca do tipo
    assert.deepEqual(nums(f.preferencia), [2, 3, 1], `${a} x ${b}`);
    assert.ok(f.preferencia.every((e) => e.concorrente), `${a} x ${b}`);
  }
});

test('processo com mais de uma preferência recebe alerta', () => {
  const p = montarPainel([P(1, '2026-11-10T10:00:00', { preferencias: ['idoso', 'doenca_grave'], preferenciaConfirmada: true })],
    { modulo: 'secretaria', referencia: '2026-11-10', contagem: { modo: 'corridos' } });
  assert.ok(p.preferencia[0].alertas.includes(ALERTA_CONCORRENCIA));
  assert.equal(p.contadores.concorrentes, 1);
});

test('ordem definida pelo juiz prevalece e remove o alerta', () => {
  const f = organizarFilas([
    P(1, '2026-11-01T10:00:00', { preferencias: ['idoso'], preferenciaConfirmada: true }),
    P(2, '2026-11-10T10:00:00', { preferencias: ['eca'], preferenciaConfirmada: true, ordemDefinidaPeloJuiz: 1 }),
    P(3, '2026-11-10T10:00:00', { preferencias: ['idoso', 'eca'], preferenciaConfirmada: true, ordemDefinidaPeloJuiz: 2 }),
  ], 'secretaria');
  assert.deepEqual(nums(f.preferencia), [2, 3, 1]);
  assert.ok(f.preferencia.every((e) => !e.concorrente));
});

test('mesma preferência na mesma data não é concorrência', () => {
  const f = organizarFilas([
    P(1, '2026-11-10T10:00:00', { preferencias: ['idoso'], preferenciaConfirmada: true }),
    P(2, '2026-11-10T08:00:00', { preferencias: ['idoso'], preferenciaConfirmada: true }),
  ], 'secretaria');
  assert.deepEqual(nums(f.preferencia), [2, 1]);
  assert.ok(f.preferencia.every((e) => !e.concorrente));
});

test('gabinete: meta do CNJ vai para a lista 2; na secretaria não existe', () => {
  const g = organizarFilas([P(1, '2026-11-20T10:00:00', { metaCNJ: true }, 'gabinete'), P(2, '2026-10-01T10:00:00', {}, 'gabinete')], 'gabinete');
  assert.deepEqual(nums(g.sequencia), [1, 2]);
  assert.deepEqual(g.preferencia[0].marcadores, ['meta_cnj']);
  const s = organizarFilas([P(1, '2026-11-20T10:00:00', { metaCNJ: true })], 'secretaria');
  assert.equal(s.preferencia.length, 0);
});

test('sem data vai para o fim da lista', () => {
  const f = organizarFilas([P(1, null), P(2, '2026-11-20T10:00:00')], 'secretaria');
  assert.deepEqual(nums(f.geral), [2, 1]);
});

test('nenhuma função de ordenação tem tabela de pesos, pontuação ou ranking entre preferências', () => {
  for (const arq of ['ordenacao.js', 'distribuicao.js', 'painel.js']) {
    const src = readFileSync(new URL(`../src/distribuidor/${arq}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /peso|pontua|score|ranking|weight|rank\b|prioridadeTipo/i, arq);
  }
  // ordenação invariante a qualquer permutação dos tipos de preferência
  const tipos = ['idoso', 'doenca_grave', 'eca', 'violencia_domestica', 'licitacao'];
  const datas = ['2026-11-05T10:00:00', '2026-11-01T10:00:00', '2026-11-03T10:00:00', '2026-11-02T10:00:00', '2026-11-04T10:00:00'];
  for (let r = 0; r < tipos.length; r++) {
    const rot = tipos.slice(r).concat(tipos.slice(0, r));
    const f = organizarFilas(datas.map((d, i) => P(i + 1, d, { preferencias: [rot[i]], preferenciaConfirmada: true })), 'secretaria');
    assert.deepEqual(nums(f.preferencia), [2, 4, 3, 5, 1]);
  }
});

test('painel: contadores e CSV com sigiloso mascarado', () => {
  const procs = [
    P(1, '2026-11-17T10:00:00', { tipoPrazo228: 'ato_5dias', sigiloso: true }),
    P(2, '2026-11-24T10:00:00', { tipoPrazo228: 'conclusao_1dia', urgenciaJuiz: { reconhecida: true, referencia: 'ID 55' } }),
  ];
  const painel = montarPainel(procs, { modulo: 'secretaria', referencia: '2026-11-25', contagem: { modo: 'uteis' } });
  assert.deepEqual(painel.contadores, { urgencia: 1, preferencia: 0, geral: 1, acimaPrazo: 1, concorrentes: 0, total: 2 });
  const csv = csvPainel(painel.sequencia, { modoContagem: 'uteis' });
  assert.ok(csv.includes('Sigiloso-01.2026.8.14.0028'));
  assert.ok(!csv.includes('0000001-01.2026.8.14.0028'));
  assert.ok(csv.includes('0000002-01.2026.8.14.0028'));
});

test('tipo de minuta pelo nome da tarefa', async () => {
  const { tipoMinutaPelaTarefa } = await import('../src/distribuidor/processo.js');
  assert.equal(tipoMinutaPelaTarefa('Minutar sentença'), 'sentenca');
  assert.equal(tipoMinutaPelaTarefa('Minutar decisão'), 'decisao');
  assert.equal(tipoMinutaPelaTarefa('Minutar despacho: intimar executado'), 'despacho');
  assert.equal(tipoMinutaPelaTarefa('Analisar petição'), null);
});
