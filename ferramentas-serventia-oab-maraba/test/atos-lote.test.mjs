import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO_PROV_006_2006, VEDACOES_PROV_006_2006, buscarInciso } from '../src/atos-lote/catalogo-prov-006-2006.js';
import {
  criarModelo, editarModelo, validarModelo, modeloValidado, modeloExemploXV, importarModelos, exportarModelos,
  incisoHabilitado, problemasDoModelo,
} from '../src/atos-lote/modelos.js';
import { gerarLote, gerarPrevia, fecho, TARJA_RASCUNHO, sugerirEtiqueta, csvRelacaoLote, csvAuditoria } from '../src/atos-lote/gerador.js';

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII',
  'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII'];
const AGORA = '2026-11-25T14:30:00';
const proc = (n, lido) => ({ numero: `${String(n).padStart(7, '0')}-01.2026.8.14.0028`, lido });

function exemploValidado() {
  const m = editarModelo(modeloExemploXV(), { prazo: '15 (quinze) dias' });
  const v = validarModelo(m, { por: 'Juízo da 1ª Vara Cível (teste)', em: AGORA });
  assert.ok(v.ok, v.erros.join('; '));
  return v.modelo;
}

test('catálogo tem os 28 incisos, na ordem, com texto literal', () => {
  assert.deepEqual(CATALOGO_PROV_006_2006.map((c) => c.inciso), ROMANOS);
  for (const c of CATALOGO_PROV_006_2006) assert.ok(c.textoLiteral.length > 30 && c.textoLiteral.endsWith(';'), c.inciso);
  assert.equal(buscarInciso('XV').textoLiteral,
    'a intimação do autor ou exequente para dizer sobre o prosseguimento do feito, se decorrido o prazo deferido de suspensão do processo, sem a manifestação da parte interessada;');
});

test('incisos de revisão ficam desabilitados até existir modelo validado', () => {
  const revisar = CATALOGO_PROV_006_2006.filter((c) => c.revisar).map((c) => c.inciso);
  for (const i of ['XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII']) assert.ok(revisar.includes(i), i);
  for (const i of revisar) assert.equal(incisoHabilitado(buscarInciso(i), []), false, i);
  assert.equal(incisoHabilitado(buscarInciso('XV'), []), true);
  const m = validarModelo(criarModelo({ inciso: 'XXV', titulo: 't', texto: 'ATO ORDINATÓRIO. Certifico o decurso.' }), { por: 'Juízo', em: AGORA });
  assert.ok(m.ok);
  assert.equal(incisoHabilitado(buscarInciso('XXV'), [m.modelo]), true);
});

test('vedações do § 3º: 7 itens', () => {
  assert.equal(VEDACOES_PROV_006_2006.length, 7);
});

test('modelo em rascunho não gera lote; a prévia mostra a tarja', () => {
  const m = modeloExemploXV();
  assert.equal(m.status, 'rascunho');
  const r = gerarLote({ modelo: m, processos: [proc(1, true)], servidor: 'Servidor A', dataHora: AGORA });
  assert.equal(r.ok, false);
  assert.equal(gerarPrevia(m).tarja, TARJA_RASCUNHO);
  assert.equal(gerarPrevia(exemploValidado()).tarja, null);
});

test('processo sem "Lido individualmente" nunca entra na saída', () => {
  const m = exemploValidado();
  const r = gerarLote({ modelo: m, processos: [proc(1, true), proc(2, false), proc(3), proc(4, 'sim')], servidor: 'Servidor A', dataHora: AGORA });
  assert.ok(r.ok);
  assert.deepEqual(r.atos.map((a) => a.numero), [proc(1).numero]);
  assert.deepEqual(r.registro.processos, [proc(1).numero]);
  assert.deepEqual(r.excluidos, [proc(2).numero, proc(3).numero, proc(4).numero]);
  const nada = gerarLote({ modelo: m, processos: [proc(2, false)], servidor: 'Servidor A', dataHora: AGORA });
  assert.equal(nada.ok, false);
  assert.ok(!csvRelacaoLote(r).includes(proc(2).numero));
});

test('todo ato termina com o fecho e o inciso correto', () => {
  const m = exemploValidado();
  const r = gerarLote({ modelo: m, processos: [proc(1, true), proc(2, true)], servidor: 'Servidor A', dataHora: AGORA });
  for (const a of r.atos) {
    assert.ok(a.texto.endsWith(fecho('XV')));
    assert.ok(a.texto.endsWith('Ato praticado com fundamento no art. 1º, § 2º, inciso XV, do Provimento nº 006/2006-CJRMB, aplicável às Comarcas do Interior por força do Provimento nº 006/2009-CJCI, e no art. 203, § 4º, do CPC.'));
    assert.ok(a.texto.includes('no prazo de 15 (quinze) dias.'));
  }
  assert.ok(r.textoUnico, 'texto idêntico para todos');
  assert.equal(r.etiqueta, 'LOTE XV · REVISADO');
  assert.equal(sugerirEtiqueta('II'), 'LOTE II · REVISADO');
});

test('modelo com {{numero}} não tem texto único', () => {
  const m = validarModelo(criarModelo({ inciso: 'XIX', titulo: 't', texto: 'ATO ORDINATÓRIO. Processo {{numero}}. Intimem-se as partes sobre a resposta ao ofício. {{data}}, {{servidor}}.' }), { por: 'Juízo', em: AGORA }).modelo;
  const r = gerarLote({ modelo: m, processos: [proc(1, true), proc(2, true)], servidor: 'Servidor B', dataHora: AGORA });
  assert.equal(r.textoUnico, null);
  assert.ok(r.atos[1].texto.includes(proc(2).numero));
  assert.ok(r.atos[0].texto.includes('25/11/2026, Servidor B.'));
});

test('nenhum modelo gera documento vedado pelo § 3º', () => {
  const termos = /alvar[aá]|mandado de pris[aã]o|busca e apreens[aã]o|desocupa[cç][aã]o/i;
  const m = exemploValidado();
  const r = gerarLote({ modelo: m, processos: [proc(1, true)], servidor: 'A', dataHora: AGORA });
  assert.doesNotMatch(r.atos[0].texto, termos);
  assert.doesNotMatch(gerarPrevia(modeloExemploXV()).texto, termos);
  for (const texto of [
    'Expeça-se alvará em favor do exequente.',
    'Expeça-se mandado de prisão civil.',
    'Expeça-se mandado de busca e apreensão.',
    'Expeça-se mandado de desocupação do imóvel.',
    'Expeça-se carta precatória para penhora e avaliação de bens.',
    'Prestem-se informações para instruir o agravo de instrumento.',
  ]) {
    const mod = criarModelo({ inciso: 'VIII', titulo: 'x', texto });
    assert.ok(problemasDoModelo(mod).some((p) => p.startsWith('Documento vedado')), texto);
    const v = validarModelo(mod, { por: 'Juízo', em: AGORA });
    assert.equal(v.ok, false, texto);
    assert.equal(gerarLote({ modelo: { ...mod, status: 'validado_pelo_juizo' }, processos: [proc(1, true)], servidor: 'A', dataHora: AGORA }).ok, false);
  }
  const imp = importarModelos(JSON.stringify({ modelos: [{ inciso: 'VIII', titulo: 'x', texto: 'Expeça-se alvará.', status: 'validado_pelo_juizo' }] }));
  assert.equal(imp.modelos.length, 0);
});

test('alterar texto de modelo validado volta para rascunho', () => {
  const m = exemploValidado();
  assert.ok(modeloValidado(m));
  const e = editarModelo(m, { texto: m.texto + ' Cumpra-se.' });
  assert.equal(e.status, 'rascunho');
  assert.equal(e.versao, m.versao + 1);
  assert.equal(e.validadoPor, null);
  assert.equal(editarModelo(m, { texto: m.texto }), m);
  // alteração feita direto no objeto (ou no .json) também derruba a validação
  assert.equal(modeloValidado({ ...m, texto: m.texto + ' x' }), false);
});

test('prazo do CPC de 1973 não é convertido: {{prazo}} exige preenchimento na validação', () => {
  const v = validarModelo(modeloExemploXV(), { por: 'Juízo', em: AGORA });
  assert.equal(v.ok, false);
  assert.ok(v.erros.some((e) => e.includes('{{prazo}}')));
  const varRuim = validarModelo(criarModelo({ inciso: 'XV', texto: 'Intime-se {{parte}}.' }), { por: 'Juízo', em: AGORA });
  assert.equal(varRuim.ok, false);
});

test('exportar e importar modelos preserva a validação; adulteração volta a rascunho', () => {
  const m = exemploValidado();
  const json = exportarModelos([m], AGORA);
  const imp = importarModelos(json);
  assert.equal(imp.modelos.length, 1);
  assert.ok(modeloValidado(imp.modelos[0]));
  const adulterado = JSON.parse(json);
  adulterado.modelos[0].prazo = '5 (cinco) dias';
  const imp2 = importarModelos(JSON.stringify(adulterado));
  assert.equal(imp2.modelos[0].status, 'rascunho');
  assert.equal(imp2.avisos.length, 1);
});

test('auditoria em CSV', () => {
  const m = exemploValidado();
  const r = gerarLote({ modelo: m, processos: [proc(1, true), proc(2, true)], servidor: 'Servidor A', dataHora: AGORA });
  const csv = csvAuditoria([r.registro]);
  assert.equal(csv.trim().split('\r\n').length, 3);
  assert.ok(csv.includes('25/11/2026 14:30;Servidor A;XV;exemplo-XV-1'));
});
