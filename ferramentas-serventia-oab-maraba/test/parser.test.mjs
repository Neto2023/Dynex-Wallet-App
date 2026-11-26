import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  reconhecerTextoLivre, lerTabela, aplicarMapeamento, sugerirMapeamento, criarPerfilMapeamento,
  aplicarPerfilMapeamento, sugerirPreferencias, deduplicar,
} from '../src/comum/parser.js';

const fixture = readFileSync(new URL('./fixtures/painel_secretaria_ficticio.txt', import.meta.url), 'utf8');

test('fixture da secretaria: reconhece todos os números e datas', () => {
  const r = reconhecerTextoLivre(fixture);
  const numeros = r.itens.map((i) => i.numero);
  assert.equal(numeros.length, 8);
  for (let n = 1; n <= 8; n++) assert.ok(numeros.includes(`000000${n}-01.2026.8.14.0028`), `faltou ${n}`);
  const porNumero = Object.fromEntries(r.itens.map((i) => [i.numero.slice(0, 7), i]));
  assert.equal(porNumero['0000001'].dataEntrada, '2026-11-18T13:35:00');
  assert.equal(porNumero['0000002'].dataEntrada, '2026-11-10T09:12:40'); // duplicado: mantém a mais antiga
  assert.equal(porNumero['0000003'].dataEntrada, '2026-11-03T00:00:00');
  assert.equal(porNumero['0000004'].dataEntrada, null);
  assert.equal(porNumero['0000005'].dataEntrada, '2026-11-24T16:05:00');
  assert.equal(porNumero['0000006'].dataEntrada, '2026-11-05T08:00:00');
  assert.equal(porNumero['0000007'].dataEntrada, '2026-11-01T00:00:00');
  assert.equal(porNumero['0000008'].dataEntrada, '2026-11-21T11:11:00');
});

test('fixture da secretaria: prévia lista o incompleto e o duplicado', () => {
  const r = reconhecerTextoLivre(fixture);
  const semData = r.incompletos.filter((i) => i.tipo === 'sem_data').map((i) => i.numero);
  assert.deepEqual(semData, ['0000004-01.2026.8.14.0028']);
  assert.equal(r.incompletos.filter((i) => i.tipo === 'sem_numero').length, 1);
  assert.equal(r.avisos.length, 1);
  assert.equal(r.avisos[0].numero, '0000002-01.2026.8.14.0028');
});

test('fixture da secretaria: tarefa, etiquetas e sugestões', () => {
  const r = reconhecerTextoLivre(fixture);
  const p = Object.fromEntries(r.itens.map((i) => [i.numero.slice(0, 7), i]));
  assert.equal(p['0000001'].tarefa, 'Prazo decorrido: remeter à conclusão');
  assert.deepEqual(p['0000001'].etiquetas, ['AGUARDANDO']);
  assert.equal(p['0000003'].tarefa, 'Expedir intimação');
  assert.deepEqual(p['0000003'].sugestoesPreferencia, ['idoso']);
  assert.equal(p['0000006'].tarefa, 'Cumprimento de sentença: intimar executado');
  assert.deepEqual(p['0000006'].sugestoesPreferencia, ['violencia_domestica']);
  assert.equal(p['0000007'].sugestaoSigiloso, true);
  assert.equal(p['0000001'].sugestaoSigiloso, false);
});

test('sugestões de prioridade por palavra-chave', () => {
  assert.deepEqual(sugerirPreferencias('Prioridade: pessoa idosa'), ['idoso']);
  assert.deepEqual(sugerirPreferencias('DOENÇA GRAVE'), ['doenca_grave']);
  assert.deepEqual(sugerirPreferencias('Criança e adolescente'), ['eca']);
  assert.deepEqual(sugerirPreferencias('Lei Maria da Penha'), ['violencia_domestica']);
  assert.deepEqual(sugerirPreferencias('Licitação, Lei 14.133'), ['licitacao']);
  assert.deepEqual(sugerirPreferencias('Prazo decorrido'), []);
});

test('dois números na mesma linha viram dois processos', () => {
  const r = reconhecerTextoLivre('0000011-01.2026.8.14.0028 01/11/2026 0000012-01.2026.8.14.0028 02/11/2026');
  assert.deepEqual(r.itens.map((i) => [i.numero.slice(0, 7), i.dataEntrada.slice(0, 10)]), [['0000011', '2026-11-01'], ['0000012', '2026-11-02']]);
});

test('deduplicação: sem data conta como mais recente', () => {
  const d = deduplicar([
    { numero: 'A', dataEntrada: null }, { numero: 'A', dataEntrada: '2026-11-02T00:00:00' }, { numero: 'B', dataEntrada: '2026-11-01T00:00:00' },
  ]);
  assert.deepEqual(d.itens.map((i) => [i.numero, i.dataEntrada]), [['A', '2026-11-02T00:00:00'], ['B', '2026-11-01T00:00:00']]);
});

test('tabela TSV com mapeamento de colunas e perfil', () => {
  const tsv = readFileSync(new URL('./fixtures/painel_gabinete_ficticio.tsv', import.meta.url), 'utf8');
  const t = lerTabela(tsv);
  assert.equal(t.separador, '\t');
  const mapa = sugerirMapeamento(t.linhas[0]);
  assert.equal(mapa.numero, 0);
  assert.equal(mapa.tarefa, 1);
  assert.equal(mapa.dataEntrada, 2);
  assert.equal(mapa.etiquetas, 3);
  assert.equal(mapa.prioridade, 4);
  const r = aplicarMapeamento(t.linhas, mapa, { temCabecalho: true });
  assert.equal(r.itens.length, 6);
  assert.deepEqual(r.itens[1].sugestoesPreferencia, ['idoso']);
  assert.equal(r.itens[0].dataEntrada, '2026-10-02T10:00:00');

  // perfil salvo funciona mesmo com as colunas em outra ordem
  const perfil = criarPerfilMapeamento(mapa, t.linhas[0], true);
  const reordenado = ['Prioridade', 'Na tarefa desde', 'Processo', 'Tarefa', 'Etiquetas'];
  const m2 = aplicarPerfilMapeamento(perfil, reordenado);
  assert.equal(m2.numero, 2);
  assert.equal(m2.dataEntrada, 1);
});

test('CSV com aspas e ponto e vírgula', () => {
  const t = lerTabela('Processo;Tarefa;Data\n"0000201-01.2026.8.14.0028";"Analisar; com ponto e vírgula";01/11/2026\nsem número;x;02/11/2026\n');
  assert.equal(t.separador, ';');
  const r = aplicarMapeamento(t.linhas, { numero: 0, tarefa: 1, dataEntrada: 2 }, { temCabecalho: true });
  assert.equal(r.itens[0].tarefa, 'Analisar; com ponto e vírgula');
  assert.equal(r.incompletos.filter((i) => i.tipo === 'sem_numero').length, 1);
});
