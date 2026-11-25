// Build sem dependências: junta src/ em um HTML autocontido por ferramenta (CSS e JS embutidos).
// Uso: node build.mjs [--sobrescrever]
// Por padrão o build NÃO sobrescreve arquivo já existente em dist/: arquivo entregue não se sobrescreve.
// Para uma nova entrega, altere VERSAO abaixo (v2, v3...). Use --sobrescrever só durante o desenvolvimento
// de uma versão ainda não entregue.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
export const VERSAO = 'v1';

const COMUM = ['src/comum/datas.js', 'src/comum/prazos.js', 'src/comum/mascara.js', 'src/comum/parser.js', 'src/comum/exporta.js', 'src/comum/interface.js'];

export const FERRAMENTAS = [
  {
    saida: `distribuidor-tarefas_${VERSAO}.html`,
    html: 'src/distribuidor/index.html',
    js: [...COMUM, 'src/distribuidor/processo.js', 'src/distribuidor/ordenacao.js', 'src/distribuidor/distribuicao.js', 'src/distribuidor/painel.js', 'src/distribuidor/ui.js'],
    textos: { EXEMPLO_SECRETARIA: 'test/fixtures/painel_secretaria_ficticio.txt', EXEMPLO_GABINETE: 'test/fixtures/painel_gabinete_ficticio.tsv' },
  },
  {
    saida: `atos-em-lote_${VERSAO}.html`,
    html: 'src/atos-lote/index.html',
    js: [...COMUM, 'src/atos-lote/catalogo-prov-006-2006.js', 'src/atos-lote/modelos.js', 'src/atos-lote/gerador.js', 'src/atos-lote/ui.js'],
    textos: { EXEMPLO_LOTE: 'test/fixtures/lote_xv_ficticio.txt' },
  },
];

const ler = (rel) => readFileSync(join(RAIZ, rel), 'utf8');

function transformarModulo(rel) {
  const src = ler(rel);
  const linhas = src.split('\n').filter((l) => !/^import\s.+from\s.+;\s*$/.test(l));
  const corpo = linhas.join('\n').replace(/^export\s+(?=(async\s+)?function\b|const\b|let\b|class\b)/gm, '');
  if (/^\s*export\b/m.test(corpo)) throw new Error(`${rel}: export não suportado pelo build (use export function/const).`);
  if (/^\s*import\b/m.test(corpo)) throw new Error(`${rel}: import em várias linhas não é suportado pelo build.`);
  const nomes = [...corpo.matchAll(/^(?:async\s+)?function\s+([\w$]+)|^(?:const|let|class)\s+([\w$]+)/gm)].map((m) => m[1] || m[2]);
  return { rel, corpo, nomes };
}

function montarJS(ferramenta) {
  const vistos = new Map();
  const partes = [];
  for (const [nome, rel] of Object.entries(ferramenta.textos || {})) {
    partes.push(`const ${nome} = ${JSON.stringify(ler(rel))};`);
    vistos.set(nome, rel);
  }
  for (const rel of ferramenta.js) {
    const m = transformarModulo(rel);
    for (const n of m.nomes) {
      if (vistos.has(n)) throw new Error(`Nome duplicado no escopo do build: ${n} (${vistos.get(n)} e ${rel}).`);
      vistos.set(n, rel);
    }
    partes.push(`// ---- ${rel} ----\n${m.corpo}`);
  }
  return `(function () {\n'use strict';\n${partes.join('\n\n')}\n})();`;
}

export function verificarSaida(nome, html) {
  const erros = [];
  if (html.includes('\u2014')) erros.push(`${nome}: contém travessão (U+2014).`);
  if (html.includes('\u2013')) erros.push(`${nome}: contém meia-risca (U+2013).`);
  if (/<(script|link|img|iframe)[^>]+(src|href)=["']?https?:/i.test(html)) erros.push(`${nome}: referência a recurso externo.`);
  if (/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/.test(html)) erros.push(`${nome}: chamada de rede no código.`);
  if (/localStorage\.setItem\((?!'oab-maraba-serventia:)/.test(html)) erros.push(`${nome}: uso de localStorage fora das preferências de interface.`);
  return erros;
}

export function construir({ sobrescrever = false, destino = join(RAIZ, 'dist') } = {}) {
  mkdirSync(destino, { recursive: true });
  const css = ler('src/comum/estilo.css');
  const logo = 'data:image/png;base64,' + readFileSync(join(RAIZ, 'src/comum/logo_oab.png')).toString('base64');
  const gerados = [];
  for (const f of FERRAMENTAS) {
    const caminho = join(destino, f.saida);
    if (existsSync(caminho) && !sobrescrever) {
      throw new Error(`${f.saida} já existe em dist/. Arquivo entregue não se sobrescreve: altere VERSAO em build.mjs ou use --sobrescrever durante o desenvolvimento.`);
    }
    const js = montarJS(f);
    let html = ler(f.html);
    html = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js).replaceAll('__LOGO__', () => logo).replaceAll('__VERSAO__', VERSAO);
    const erros = verificarSaida(f.saida, html);
    if (erros.length) throw new Error(erros.join('\n'));
    writeFileSync(caminho, html, 'utf8');
    gerados.push({ arquivo: caminho, bytes: Buffer.byteLength(html) });
  }
  return gerados;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const gerados = construir({ sobrescrever: process.argv.includes('--sobrescrever') });
    for (const g of gerados) console.log(`gerado: ${g.arquivo} (${(g.bytes / 1024).toFixed(1)} KB)`);
  } catch (e) {
    console.error('Falha no build:\n' + e.message);
    process.exit(1);
  }
}
