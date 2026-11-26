import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairDatas, lerData, formatarDataBR, diaSerial, diaDaSemana } from '../src/comum/datas.js';
import { diasDecorridos, avaliarPrazo228, lerFeriados, lerSuspensoes } from '../src/comum/prazos.js';
import { mascararNumero, numeroPublico } from '../src/comum/mascara.js';

test('extrai datas com e sem hora', () => {
  const d = extrairDatas('entrada 18/11/2026 13:35, outra 10/11/2026 09:12:40 e 03/11/2026; inválida 31/02/2026');
  assert.deepEqual(d.map((x) => x.iso), ['2026-11-18T13:35:00', '2026-11-10T09:12:40', '2026-11-03T00:00:00']);
  assert.equal(extrairDatas('24/11/2026 às 16:05')[0].iso, '2026-11-24T16:05:00');
});

test('lê data em formato brasileiro ou ISO', () => {
  assert.equal(lerData('05/11/2026 08:00'), '2026-11-05T08:00:00');
  assert.equal(lerData('2026-11-05'), '2026-11-05T00:00:00');
  assert.equal(lerData('2026-11-05T08:30'), '2026-11-05T08:30:00');
  assert.equal(lerData('xx'), null);
  assert.equal(formatarDataBR('2026-11-05T08:30:00'), '05/11/2026 08:30');
  assert.equal(formatarDataBR('2026-11-05T00:00:00'), '05/11/2026');
});

test('dia da semana sem fuso', () => {
  assert.equal(diaDaSemana(diaSerial('2026-11-25')), 3); // quarta-feira
  assert.equal(diaDaSemana(diaSerial('2026-11-21')), 6); // sábado
});

const corridos = { modo: 'corridos', feriados: [], suspensoes: [] };
const uteis = { modo: 'uteis', feriados: [], suspensoes: [] };
const uteisFeriado = { modo: 'uteis', feriados: ['2026-11-20'], suspensoes: [] };

test('contagem em dias corridos e úteis', () => {
  assert.equal(diasDecorridos('2026-11-17T10:00:00', '2026-11-25', corridos), 8);
  assert.equal(diasDecorridos('2026-11-17T10:00:00', '2026-11-25', uteis), 6);
  assert.equal(diasDecorridos('2026-11-17T10:00:00', '2026-11-25', uteisFeriado), 5);
  assert.equal(diasDecorridos('2026-11-20T17:00:00', '2026-11-23', uteis), 1); // sexta para segunda
  assert.equal(diasDecorridos('2026-11-20T17:00:00', '2026-11-23', corridos), 3);
  assert.equal(diasDecorridos('2026-11-25T08:00:00', '2026-11-25', corridos), 0);
  assert.equal(diasDecorridos('2026-11-26T08:00:00', '2026-11-25', corridos), 0);
});

test('suspensão é descontada nos dois modos', () => {
  const s = [{ inicio: '2026-11-23', fim: '2026-11-24' }];
  assert.equal(diasDecorridos('2026-11-20', '2026-11-25', { modo: 'corridos', feriados: [], suspensoes: s }), 3);
  assert.equal(diasDecorridos('2026-11-20', '2026-11-25', { modo: 'uteis', feriados: [], suspensoes: s }), 1);
});

test('alertas do art. 228 batem com a contagem configurada', () => {
  const ato = { tipoPrazo228: 'ato_5dias', dataEntrada: '2026-11-17T10:00:00' };
  assert.equal(avaliarPrazo228(ato, '2026-11-25', uteis).vencido, true);
  assert.equal(avaliarPrazo228(ato, '2026-11-25', uteis).alerta, 'Prazo de 5 dias vencido');
  assert.equal(avaliarPrazo228(ato, '2026-11-25', uteisFeriado).vencido, false);
  assert.equal(avaliarPrazo228(ato, '2026-11-25', corridos).vencido, true);

  const concl = { tipoPrazo228: 'conclusao_1dia', dataEntrada: '2026-11-20T17:00:00' };
  assert.equal(avaliarPrazo228(concl, '2026-11-23', uteis).vencido, false);
  assert.equal(avaliarPrazo228(concl, '2026-11-23', corridos).vencido, true);
  assert.equal(avaliarPrazo228(concl, '2026-11-23', corridos).alerta, 'Prazo de 1 dia vencido');

  const semPrazo = { tipoPrazo228: 'nenhum', dataEntrada: '2026-01-01' };
  assert.equal(avaliarPrazo228(semPrazo, '2026-11-25', corridos).vencido, false);
  assert.equal(avaliarPrazo228({ tipoPrazo228: 'ato_5dias', dataEntrada: null }, '2026-11-25', corridos).dias, null);
});

test('lê feriados e suspensões digitados', () => {
  const f = lerFeriados('20/11/2026 Consciência Negra\n\n25/12/2026\nxx');
  assert.deepEqual(f.feriados, ['2026-11-20', '2026-12-25']);
  assert.equal(f.erros.length, 1);
  const s = lerSuspensoes('20/12/2026 a 20/01/2027\n02/11/2026');
  assert.deepEqual(s.suspensoes, [{ inicio: '2026-12-20', fim: '2027-01-20' }, { inicio: '2026-11-02', fim: '2026-11-02' }]);
});

test('máscara de sigiloso no padrão do TJPA', () => {
  assert.equal(mascararNumero('0000007-01.2026.8.14.0028'), 'Sigiloso-01.2026.8.14.0028');
  assert.equal(numeroPublico({ numero: '0000007-01.2026.8.14.0028', sigiloso: true }), 'Sigiloso-01.2026.8.14.0028');
  assert.equal(numeroPublico({ numero: '0000007-01.2026.8.14.0028', sigiloso: false }), '0000007-01.2026.8.14.0028');
});
