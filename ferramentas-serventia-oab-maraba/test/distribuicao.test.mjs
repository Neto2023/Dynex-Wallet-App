import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoProcesso } from '../src/distribuidor/processo.js';
import { organizarFilas } from '../src/distribuidor/ordenacao.js';
import { distribuir } from '../src/distribuidor/distribuicao.js';

function gerar(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const dia = String(1 + (i % 28)).padStart(2, '0');
    const extra = i % 10 === 0 ? { urgenciaJuiz: { reconhecida: true, referencia: `ID ${i}` } }
      : i % 7 === 0 ? { preferencias: ['idoso'], preferenciaConfirmada: true } : {};
    out.push(novoProcesso({ numero: `${String(i).padStart(7, '0')}-01.2026.8.14.0028`, dataEntrada: `2026-10-${dia}T10:00:00`, ...extra }));
  }
  return out;
}
const seq = (procs) => organizarFilas(procs, 'secretaria').sequencia.map((e) => e.processo);

test('124 processos e 3 servidores a 100%: 41/41/42', () => {
  const r = distribuir(seq(gerar(124)), [{ nome: 'Servidor A', fator: 1 }, { nome: 'Servidor B', fator: 1 }, { nome: 'Servidor C', fator: 1 }]);
  assert.deepEqual(Object.values(r.contagem).sort(), [41, 41, 42]);
  assert.equal(r.atribuicoes.size, 124);
  assert.match(r.resumo, /^Servidor A: \d+ · Servidor B: \d+ · Servidor C: \d+$/);
});

test('servidor a 50% recebe metade da carga dos demais', () => {
  const r = distribuir(seq(gerar(124)), [{ nome: 'Servidor A', fator: 1 }, { nome: 'Servidor B', fator: 1 }, { nome: 'Servidor C', fator: 0.5 }]);
  const { 'Servidor A': a, 'Servidor B': b, 'Servidor C': c } = r.contagem;
  assert.equal(a + b + c, 124);
  assert.ok(Math.abs(a - 49.6) <= 1 && Math.abs(b - 49.6) <= 1 && Math.abs(c - 24.8) <= 1, JSON.stringify(r.contagem));
});

test('empate resolvido pela ordem alfabética e fila na ordem das listas', () => {
  const procs = seq(gerar(6));
  const r = distribuir(procs, [{ nome: 'Bruna', fator: 1 }, { nome: 'Ana', fator: 1 }]);
  assert.equal(r.atribuicoes.get(procs[0].numero), 'Ana');
  assert.equal(r.atribuicoes.get(procs[1].numero), 'Bruna');
});

test('responsável fixado é mantido e entra na contagem', () => {
  const procs = seq(gerar(10));
  procs[5].responsavel = 'Ana'; procs[5].responsavelFixado = true;
  procs[6].responsavel = 'Ana'; procs[6].responsavelFixado = true;
  const r = distribuir(procs, [{ nome: 'Ana', fator: 1 }, { nome: 'Bruna', fator: 1 }]);
  assert.equal(r.atribuicoes.get(procs[5].numero), 'Ana');
  assert.equal(r.atribuicoes.get(procs[6].numero), 'Ana');
  assert.deepEqual(r.contagem, { Ana: 5, Bruna: 5 });
});

test('sem servidores: aviso e nenhuma atribuição', () => {
  const r = distribuir(seq(gerar(3)), []);
  assert.equal(r.atribuicoes.size, 0);
  assert.equal(r.avisos.length, 1);
});
