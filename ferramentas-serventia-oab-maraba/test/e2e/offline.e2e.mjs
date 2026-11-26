// Teste ponta a ponta das duas ferramentas abertas via file:// com a rede desligada.
// Uso: node test/e2e/offline.e2e.mjs [--sobrescrever-capturas]   (requer o Playwright já instalado)
// Gera capturas de tela em docs/screenshots/<versão>/. Capturas entregues não se sobrescrevem: se a pasta
// da versão já existe, o teste para, salvo com --sobrescrever-capturas (só durante o desenvolvimento).

import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(RAIZ, 'dist');
const { VERSAO } = await import(pathToFileURL(join(RAIZ, 'build.mjs')).href);
const PASTA_VERSAO = join(RAIZ, 'docs', 'screenshots', VERSAO);
// Capturas entregues não se sobrescrevem: se a pasta da versão já existe, as verificações rodam normalmente
// e as capturas vão para uma pasta temporária (salvo --sobrescrever-capturas, só em versão não entregue).
const FOTOS = existsSync(PASTA_VERSAO) && !process.argv.includes('--sobrescrever-capturas')
  ? mkdtempSync(join(tmpdir(), `capturas-${VERSAO}-`))
  : PASTA_VERSAO;
mkdirSync(FOTOS, { recursive: true });
const ARQ_DIST = join(DIST, `distribuidor-tarefas_${VERSAO}.html`);
const ARQ_ATOS = join(DIST, `atos-em-lote_${VERSAO}.html`);

for (const arq of [ARQ_DIST, ARQ_ATOS]) {
  const html = readFileSync(arq, 'utf8');
  assert.ok(!html.includes('\u2014'), `travessão em ${arq}`);
}

const browser = await chromium.launch();
const requisicoesExternas = [];
const errosPagina = [];

async function novaPagina() {
  const ctx = await browser.newContext({ offline: true, acceptDownloads: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'pt-BR', timezoneId: 'America/Belem' });
  ctx.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) requisicoesExternas.push(r.url()); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errosPagina.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errosPagina.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => { window.print = () => { window.__impressoes = (window.__impressoes || 0) + 1; }; });
  return { ctx, page };
}

async function baixar(page, seletor) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(seletor)]);
  const caminho = await dl.path();
  return { nome: dl.suggestedFilename(), texto: readFileSync(caminho, 'utf8') };
}

// ---------------- Ferramenta I ----------------
{
  const { ctx, page } = await novaPagina();
  await page.goto(pathToFileURL(ARQ_DIST).href);
  await page.waitForSelector('#contadores .contador');

  // data de referência fixa para o teste
  await page.click('#bt-config');
  await page.fill('#cfg-referencia', '2026-11-25');
  await page.click('#bt-aplicar-config');

  // 1. Colar o fixture e conferir a prévia
  await page.click('#bt-exemplo');
  await page.click('#bt-reconhecer');
  await page.waitForSelector('#previa:not([hidden])');
  assert.equal(await page.locator('#previa-corpo tr').count(), 8, 'prévia com 8 processos');
  const resumo = await page.textContent('#previa-resumo');
  assert.match(resumo, /8 processo\(s\) reconhecido\(s\)\. 1 sem data/);
  assert.match(resumo, /1 linha\(s\) sem número/);
  assert.match(resumo, /1 número\(s\) repetido\(s\)/);
  await page.click('#bt-aceitar-previa');
  assert.equal(await page.textContent('[data-cont="geral"]'), '8');

  // 2. Servidores e distribuição
  for (const nome of ['Servidor A', 'Servidor B', 'Servidor C']) {
    await page.fill('#novo-servidor', nome);
    await page.click('#bt-add-servidor');
  }
  // 3. Marcações manuais
  const editar = async (numero) => {
    await page.click(`#lista-corpo tr[data-numero="${numero}"]`);
    await page.waitForSelector('#dlg-processo[open]');
  };
  await page.click('#abas-listas [data-lista="todas"]');
  await editar('0000003-01.2026.8.14.0028');
  await page.check('#ed-pref-confirmada');
  await page.click('#bt-salvar-processo');
  await editar('0000006-01.2026.8.14.0028');
  await page.check('#ed-pref-confirmada');
  await page.click('#bt-salvar-processo');
  await editar('0000007-01.2026.8.14.0028');
  await page.check('#ed-sigiloso');
  await page.click('#bt-salvar-processo');
  await editar('0000005-01.2026.8.14.0028');
  await page.check('#ed-urgencia');
  await page.click('#bt-salvar-processo');
  assert.ok(await page.isVisible('#dlg-processo[open] .alerta-caixa'), 'urgência sem referência é recusada');
  await page.fill('#ed-urg-ref', 'ID 100000001');
  await page.click('#bt-salvar-processo');

  await page.click('#bt-distribuir');
  assert.match(await page.textContent('#resumo-distribuicao'), /Servidor A: 3 · Servidor B: 3 · Servidor C: 2/);
  assert.equal(await page.textContent('[data-cont="urgencia"]'), '1');
  assert.equal(await page.textContent('[data-cont="preferencia"]'), '2');
  assert.equal(await page.textContent('[data-cont="geral"]'), '5');

  // ordem: urgente primeiro, depois preferências por antiguidade, depois geral
  const ordem = await page.$$eval('#lista-corpo tr[data-numero]', (trs) => trs.map((t) => t.dataset.numero.slice(0, 7)));
  assert.deepEqual(ordem.slice(0, 3), ['0000005', '0000003', '0000006']);

  // 4. Alertas do art. 228 nos dois modos
  const alertasUteis = await page.locator('#lista-corpo .alertas-celula', { hasText: 'Prazo de 5 dias vencido' }).count();
  await page.click('#bt-config');
  await page.check('input[name="modo-contagem"][value="corridos"]');
  await page.click('#bt-aplicar-config');
  const alertasCorridos = await page.locator('#lista-corpo .alertas-celula', { hasText: 'Prazo de 5 dias vencido' }).count();
  assert.ok(alertasCorridos >= alertasUteis, 'corridos gera ao menos os alertas de úteis');
  await page.click('#bt-config');
  await page.check('input[name="modo-contagem"][value="uteis"]');
  await page.click('#bt-aplicar-config');

  // 5. Sigiloso mascarado em CSV e impressão
  const csv = await baixar(page, '#bt-csv-completo');
  assert.ok(csv.texto.includes('Sigiloso-01.2026.8.14.0028'), 'CSV mascara sigiloso');
  assert.ok(!csv.texto.includes('0000007-01.2026.8.14.0028'), 'CSV não traz o número sigiloso');
  await page.click('#bt-imprimir-lista');
  const impresso = await page.textContent('#area-impressao');
  assert.ok(impresso.includes('Sigiloso-01.2026.8.14.0028') && !impresso.includes('0000007-01.2026.8.14.0028'), 'impressão mascara sigiloso');

  // 6. Fila por servidor e sessão
  await page.click('#abas-listas [data-lista="servidor"]');
  assert.ok(await page.locator('#lista-corpo tr[data-numero]').count() >= 2);
  const sessao = await baixar(page, '#bt-salvar-sessao');
  const dadosSessao = JSON.parse(sessao.texto);
  assert.equal(dadosSessao.modulos.secretaria.processos.length, 8);
  assert.equal(await page.evaluate(() => Object.keys(localStorage).filter((k) => !k.startsWith('oab-maraba-serventia:')).length), 0);
  const ls = await page.evaluate(() => JSON.stringify(localStorage));
  assert.ok(!ls.includes('0000'), 'localStorage não guarda número de processo');

  await page.click('#abas-listas [data-lista="todas"]');
  await page.evaluate(() => { window.scrollTo(0, 0); for (const id of ['aviso-flutuante', 'aviso-flutuante-erro']) { const a = document.getElementById(id); if (a) a.hidden = true; } const r = document.getElementById('rodape'); if (r) r.style.position = 'static'; });
  await page.screenshot({ path: join(FOTOS, `distribuidor-tarefas_${VERSAO}_secretaria.png`), fullPage: true });

  // Gabinete com o exemplo em tabela
  await page.click('[data-modulo="gabinete"]');
  await page.click('[data-entrada="tabela"]');
  await page.click('#bt-exemplo-tabela');
  await page.click('#bt-aplicar-mapa');
  await page.selectOption('#previa-tipo-prazo', 'conclusao_1dia');
  await page.click('#bt-config');
  await page.click('#bt-aplicar-config'); // redesenha a tela inteira
  assert.equal(await page.inputValue('#previa-tipo-prazo'), 'conclusao_1dia', 'C-04: escolha do prazo mantida');
  await page.click('#bt-aceitar-previa');
  const sessaoGab = JSON.parse((await baixar(page, '#bt-salvar-sessao')).texto);
  assert.ok(sessaoGab.modulos.gabinete.processos.every((p) => p.tipoPrazo228 === 'conclusao_1dia'), 'C-04: processos entram com o prazo escolhido');
  assert.equal(sessaoGab.modulos.gabinete.processos.find((p) => p.numero.startsWith('0000101')).tipoMinuta, 'sentenca');
  assert.equal(await page.textContent('[data-cont="geral"]'), '6');
  await page.evaluate(() => { window.scrollTo(0, 0); for (const id of ['aviso-flutuante', 'aviso-flutuante-erro']) { const a = document.getElementById(id); if (a) a.hidden = true; } const r = document.getElementById('rodape'); if (r) r.style.position = 'static'; });
  await page.screenshot({ path: join(FOTOS, `distribuidor-tarefas_${VERSAO}_gabinete.png`), fullPage: true });
  await ctx.close();
}

// ---------------- Ferramenta II ----------------
{
  const { ctx, page } = await novaPagina();
  await page.goto(pathToFileURL(ARQ_ATOS).href);
  await page.waitForSelector('#lista-incisos button');

  // 1. Catálogo com 28 incisos e os de revisão desabilitados
  assert.equal(await page.locator('#lista-incisos button').count(), 28);
  const desabilitados = await page.$$eval('#lista-incisos button[aria-disabled=true]', (bs) => bs.map((b) => b.dataset.inciso));
  for (const i of ['XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII']) assert.ok(desabilitados.includes(i), i);
  assert.equal(await page.locator('#lista-vedacoes li').count(), 7);

  // 2. Processos: só os lidos entram
  await page.click('#bt-exemplo-processos');
  await page.click('#bt-reconhecer-processos');
  assert.equal(await page.locator('#processos-corpo tr').count(), 5);
  const chks = page.locator('#processos-corpo input[type=checkbox]');
  await chks.nth(0).check();
  await chks.nth(2).check();
  await chks.nth(4).check();
  await page.fill('#servidor', 'Servidor A');
  await page.click('#lista-incisos [data-inciso="III"]');
  assert.equal(await page.locator('#processos-corpo input[type=checkbox]:checked').count(), 0, 'C-01: leitura do XV não vale para o III');
  await page.click('#lista-incisos [data-inciso="XV"]');
  assert.equal(await page.locator('#processos-corpo input[type=checkbox]:checked').count(), 3, 'C-01: leitura do XV preservada');

  // 3. Modelo em rascunho: só prévia, com tarja
  assert.ok(await page.isDisabled('#bt-gerar'));
  assert.ok((await page.textContent('#previa-ato')).includes('MODELO NÃO VALIDADO PELO JUÍZO'));
  await page.evaluate(() => { for (const id of ['aviso-flutuante', 'aviso-flutuante-erro']) { const a = document.getElementById(id); if (a) a.hidden = true; } const r = document.getElementById('rodape'); if (r) r.style.position = 'static'; });
  await page.screenshot({ path: join(FOTOS, `atos-em-lote_${VERSAO}_rascunho.png`), fullPage: true });

  // 4. Preencher prazo, salvar e validar
  await page.fill('#mod-prazo', '15 (quinze) dias');
  await page.click('#bt-salvar-modelo');
  await page.fill('#mod-validador', 'Juízo da 1ª Vara Cível (teste)');
  await page.click('#bt-validar');
  assert.ok(!(await page.textContent('#previa-ato')).includes('MODELO NÃO VALIDADO'));
  assert.equal((await page.textContent('#bt-gerar')).trim(), 'Gerar 3 atos do lote');
  await page.click('#bt-gerar');
  await page.waitForSelector('#cartao-saida:not([hidden])');
  const unico = await page.textContent('#texto-unico');
  assert.ok(unico.trim().endsWith('Ato praticado com fundamento no art. 1º, § 2º, inciso XV, do Provimento nº 006/2006-CJRMB, aplicável às Comarcas do Interior por força do Provimento nº 006/2009-CJCI, e no art. 203, § 4º, do CPC.'));
  const relacao = await baixar(page, '#bt-baixar-relacao');
  const linhas = relacao.texto.trim().split(/\r?\n/);
  assert.equal(linhas.length, 4, 'cabeçalho e 3 processos lidos');
  assert.ok(!relacao.texto.includes('0000302-01.2026.8.14.0028'), 'não lido fica fora');
  const txt = await baixar(page, '#bt-baixar-txt');
  assert.ok(txt.texto.includes('inciso XV'));
  assert.equal(await page.locator('#auditoria-corpo tr').count(), 1);
  assert.equal(await page.locator('#processos-corpo input[type=checkbox]:checked').count(), 0, 'C-01: leitura zerada depois do lote');
  assert.ok(await page.isDisabled('#bt-gerar'), 'C-01: gerar de novo exige nova leitura');
  assert.match(await page.textContent('#processos-corpo'), /já gerado em/);
  const aud = await baixar(page, '#bt-csv-auditoria');
  assert.equal(aud.texto.trim().split(/\r?\n/).length, 4);

  await page.evaluate(() => { window.scrollTo(0, 0); for (const id of ['aviso-flutuante', 'aviso-flutuante-erro']) { const a = document.getElementById(id); if (a) a.hidden = true; } const r = document.getElementById('rodape'); if (r) r.style.position = 'static'; });
  await page.screenshot({ path: join(FOTOS, `atos-em-lote_${VERSAO}_validado.png`), fullPage: true });

  // 5. Alterar modelo validado volta para rascunho
  await page.fill('#mod-texto', (await page.inputValue('#mod-texto')) + ' Cumpra-se.');
  await page.click('#bt-salvar-modelo');
  assert.ok(await page.isDisabled('#bt-gerar'));
  assert.ok((await page.textContent('#previa-ato')).includes('MODELO NÃO VALIDADO PELO JUÍZO'));

  // 6. Não há caminho para documento vedado: o modelo com "alvará" não valida
  await page.fill('#mod-texto', 'ATO ORDINATÓRIO. Expeça-se alvará em favor da parte.');
  await page.click('#bt-salvar-modelo');
  assert.ok(await page.isDisabled('#bt-validar'));
  await ctx.close();
}

await browser.close();

assert.deepEqual(requisicoesExternas, [], 'nenhuma requisição de rede');
assert.deepEqual(errosPagina, [], 'sem erros de JavaScript');
console.log(`E2E offline: ok. Capturas em ${FOTOS}.`);
