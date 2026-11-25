// Testes de regressão dos achados da auditoria da v1 (docs/auditoria_v1.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { celulaCSV, paraCSV } from '../src/comum/exporta.js';
import { sugerirMapeamento, normalizarMapa, aplicarPerfilMapeamento, criarPerfilMapeamento } from '../src/comum/parser.js';
import { normalizarContagem } from '../src/comum/prazos.js';
import { novoProcesso } from '../src/distribuidor/processo.js';
import { montarPainel, linhasExportacao } from '../src/distribuidor/painel.js';
import { marcarLido, lidoNoInciso, processosDoInciso, zerarLidos, migrarProcessosV1 } from '../src/atos-lote/selecao.js';
import { gerarLote } from '../src/atos-lote/gerador.js';
import { editarModelo, validarModelo, modeloExemploXV } from '../src/atos-lote/modelos.js';
import { construir } from '../build.mjs';

const AGORA = '2026-11-25T14:30:00';
const num = (n) => `${String(n).padStart(7, '0')}-01.2026.8.14.0028`;

// C-01: "Lido" vale por inciso e é zerado depois do lote
test('C-01: lido marcado para um inciso não vale para outro', () => {
  const procs = [{ numero: num(1) }, { numero: num(2) }];
  marcarLido(procs[0], 'XV', true);
  assert.equal(lidoNoInciso(procs[0], 'XV'), true);
  assert.equal(lidoNoInciso(procs[0], 'III'), false);
  assert.deepEqual(processosDoInciso(procs, 'III').map((p) => p.lido), [false, false]);
  assert.deepEqual(processosDoInciso(procs, 'XV').map((p) => p.lido), [true, false]);
});

test('C-01: depois de gerar o lote a marcação do inciso é zerada', () => {
  const modelo = validarModelo(editarModelo(modeloExemploXV(), { prazo: '15 (quinze) dias' }), { por: 'Juízo', em: AGORA }).modelo;
  const procs = [{ numero: num(1) }, { numero: num(2) }];
  procs.forEach((p) => marcarLido(p, 'XV', true));
  const lote = gerarLote({ modelo, processos: processosDoInciso(procs, 'XV'), servidor: 'A', dataHora: AGORA });
  assert.ok(lote.ok);
  zerarLidos(procs, 'XV', lote.registro.processos);
  const repetido = gerarLote({ modelo, processos: processosDoInciso(procs, 'XV'), servidor: 'A', dataHora: AGORA });
  assert.equal(repetido.ok, false, 'gerar de novo sem nova leitura é impossível');
});

test('C-01: sessão da v1 não carrega marcações de leitura', () => {
  const r = migrarProcessosV1([{ numero: num(1), lido: true }, { numero: num(2), lido: false }]);
  assert.deepEqual(r.processos.map((p) => lidoNoInciso(p, 'XV')), [false, false]);
  assert.equal(r.descartados, 1);
});

// C-02: coluna inexistente não vira coluna 0
test('C-02: perfil que aponta para coluna inexistente vira "não usar"', () => {
  const perfil = criarPerfilMapeamento({ numero: 0, dataEntrada: 2, etiquetas: 4, prioridade: 5 }, ['Processo', 'Tarefa', 'Data', 'X', 'Etiquetas', 'Prioridade'], true);
  const mapa = aplicarPerfilMapeamento(perfil, ['Processo', 'Tarefa', 'Data', 'Outra'], 4);
  assert.equal(mapa.numero, 0);
  assert.equal(mapa.dataEntrada, 2);
  assert.equal(mapa.etiquetas, -1);
  assert.equal(mapa.prioridade, -1);
  assert.deepEqual(normalizarMapa({ a: '', b: 'x', c: 7, d: 1, e: -3 }, 4), { a: -1, b: -1, c: -1, d: 1, e: -1 });
});

// C-03: sugestão recusada não volta
test('C-03: ao restaurar, a sugestão não volta a ser preferência', () => {
  const doParser = novoProcesso({ numero: num(1), sugestoesPreferencia: ['idoso'] }, 'secretaria', { doParser: true });
  assert.deepEqual(doParser.preferencias, ['idoso']);
  const restaurado = novoProcesso({ numero: num(1), preferencias: [], sugestoesPreferencia: ['idoso'], sugestoesRevisadas: true }, 'secretaria');
  assert.deepEqual(restaurado.preferencias, []);
  assert.equal(restaurado.sugestoesRevisadas, true);
  const painel = montarPainel([restaurado], { modulo: 'secretaria', referencia: '2026-11-25', contagem: { modo: 'corridos' } });
  assert.ok(!painel.geral[0].alertas.some((a) => a.startsWith('Preferência sugerida')));
  const naoRevisado = novoProcesso({ numero: num(2), sugestoesPreferencia: ['eca'] }, 'secretaria');
  const p2 = montarPainel([naoRevisado], { modulo: 'secretaria', referencia: '2026-11-25', contagem: { modo: 'corridos' } });
  assert.ok(p2.geral[0].alertas.includes('Preferência sugerida: confirmar (ECA)'));
});

// C-05: "Nome da parte" não é número do processo
test('C-05: cabeçalho com "no" no meio não vira coluna do número', () => {
  assert.equal(sugerirMapeamento(['Nome da parte', 'Processo', 'Data']).numero, 1);
  assert.equal(sugerirMapeamento(['Data de entrada no órgão', 'Processo']).numero, 1);
  assert.equal(sugerirMapeamento(['Data de entrada no órgão', 'Processo']).dataEntrada, 0);
  assert.equal(sugerirMapeamento(['Nº', 'Tarefa']).numero, 0);
  assert.equal(sugerirMapeamento(['N.º do processo', 'Tarefa']).numero, 0);
});

// C-06: datas do perfil em dd/mm/aaaa são normalizadas
test('C-06: feriados e suspensões do perfil viram ISO', () => {
  const c = normalizarContagem({ modo: 'uteis', feriados: ['20/11/2026', '2026-12-25', 'xx'], suspensoes: [{ inicio: '20/12/2026', fim: '06/01/2027' }, { inicio: 'x', fim: 'y' }] });
  assert.deepEqual(c.feriados, ['2026-11-20', '2026-12-25']);
  assert.deepEqual(c.suspensoes, [{ inicio: '2026-12-20', fim: '2027-01-06' }]);
  assert.equal(normalizarContagem({ modo: 'outro' }).modo, 'uteis');
});

// C-08: ordem exportada igual à exibida
test('C-08: o CSV da fila usa a ordem exibida', () => {
  const p = novoProcesso({ numero: num(1), dataEntrada: '2026-11-01T10:00:00' });
  const { cab, linhas } = linhasExportacao([{ processo: p, lista: 'geral', ordem: 7, posicao: 9, ordemExibida: 2, marcadores: [], alertas: [], dias: 3 }]);
  assert.equal(cab[0], 'Ordem');
  assert.equal(linhas[0][0], 2);
});

// S-01: CSV contra fórmulas
test('S-01: célula que começa com = + - @ é neutralizada', () => {
  assert.equal(celulaCSV('=HYPERLINK("http://x";"a")'), '"\'=HYPERLINK(""http://x"";""a"")"');
  assert.equal(celulaCSV('+1'), "'+1");
  assert.equal(celulaCSV('-1'), "'-1");
  assert.equal(celulaCSV('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(celulaCSV('  =1'), "'  =1");
  assert.equal(celulaCSV('\t=1'), "'\t=1");
  assert.equal(celulaCSV(num(1)), num(1));
  assert.equal(celulaCSV('25/11/2026 10:00'), '25/11/2026 10:00');
  assert.equal(celulaCSV(3), '3');
  assert.ok(paraCSV(['a'], [['=1']]).includes("'=1"));
});

// C-10: build não grava nada se algum arquivo já existe
test('C-10: build verifica todas as saídas antes de gravar', () => {
  const destino = mkdtempSync(join(tmpdir(), 'build-'));
  const primeiro = construir({ destino });
  assert.equal(primeiro.length, 2);
  const outro = mkdtempSync(join(tmpdir(), 'build-'));
  writeFileSync(join(outro, primeiro[1].arquivo.split('/').pop()), 'entregue');
  assert.throws(() => construir({ destino: outro }));
  assert.deepEqual(readdirSync(outro), [primeiro[1].arquivo.split('/').pop()], 'nenhum arquivo novo gravado');
  assert.ok(existsSync(primeiro[0].arquivo));
});

test('revisão: sessão com número repetido vira uma linha só', async () => {
  const { restaurarProcessos } = await import('../src/atos-lote/selecao.js');
  const r = restaurarProcessos([
    { numero: num(1), lidos: { XV: true } }, { numero: num(1), gerados: { III: '2026-11-25T10:00:00' } }, { numero: num(2), lidos: { __proto__: true, ZZ: true } },
  ]);
  assert.equal(r.length, 2);
  assert.deepEqual(r[0].lidos, { XV: true });
  assert.deepEqual(r[0].gerados, { III: '2026-11-25T10:00:00' });
  assert.deepEqual(r[1].lidos, {});
});
