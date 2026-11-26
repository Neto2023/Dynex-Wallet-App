import { buscarInciso, PADROES_VEDADOS } from './catalogo-prov-006-2006.js';
import { normalizarBusca } from '../comum/parser.js';

// Modelos de ato ordinatório. Só modelo "validado_pelo_juizo" gera lote; rascunho gera só prévia.
// Variáveis permitidas: {{numero}}, {{prazo}}, {{data}}, {{servidor}}. Nada de dado de parte no modelo.
// O fecho do art. 2º do provimento é inserido pelo gerador e não faz parte do texto do modelo.

export const STATUS_MODELO = Object.freeze({ rascunho: 'Rascunho', validado_pelo_juizo: 'Validado pelo juízo' });
export const VARIAVEIS_PERMITIDAS = Object.freeze(['numero', 'prazo', 'data', 'servidor']);

// Impressão digital simples (FNV-1a, 32 bits) do conteúdo validado. Não é assinatura: serve para detectar
// alteração do texto de um modelo validado num arquivo .json editado fora da ferramenta.
export function impressaoDigital(texto) {
  let h = 0x811c9dc5;
  const s = String(texto);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function conteudoValidado(m) {
  return [m.inciso, m.titulo, m.texto, m.prazo].join('\u0001');
}

let contadorId = 0;
export function gerarIdModelo(inciso) {
  contadorId++;
  return `mod-${inciso}-${Date.now().toString(36)}-${contadorId}`;
}

export function criarModelo({ id, inciso, titulo = '', texto = '', prazo = '' } = {}) {
  return {
    id: id || gerarIdModelo(inciso),
    inciso,
    titulo: String(titulo),
    texto: String(texto),
    prazo: String(prazo),
    status: 'rascunho',
    validadoPor: null,
    validadoEm: null,
    versao: 1,
    conferencia: null,
  };
}

export function variaveisDoTexto(texto) {
  return [...String(texto).matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1]);
}

export function vedacoesNoTexto(texto) {
  const t = normalizarBusca(texto);
  return PADROES_VEDADOS.filter((p) => p.re.test(t)).map((p) => p.motivo);
}

// Problemas que impedem a validação (e, portanto, a geração do lote).
export function problemasDoModelo(m) {
  const erros = [];
  if (!buscarInciso(m.inciso)) erros.push('Inciso inexistente no catálogo do art. 1º, § 2º.');
  if (!String(m.texto).trim()) erros.push('O texto do modelo está vazio.');
  for (const v of variaveisDoTexto(m.texto)) {
    if (!VARIAVEIS_PERMITIDAS.includes(v)) erros.push(`Variável não permitida: {{${v}}}. Use só {{numero}}, {{prazo}}, {{data}} e {{servidor}}.`);
  }
  if (variaveisDoTexto(m.texto).includes('prazo') && !String(m.prazo).trim()) {
    erros.push('O modelo usa {{prazo}}: o prazo deve ser preenchido na validação (o código não converte prazo do CPC de 1973).');
  }
  for (const v of vedacoesNoTexto(m.texto)) erros.push(`Documento vedado à secretaria: ${v}.`);
  if (/provimento\s*n?º?\s*006\/2006/i.test(m.texto)) erros.push('Não inclua o fecho no texto: ele é inserido automaticamente pelo gerador.');
  return [...new Set(erros)];
}

// Qualquer alteração de texto, título ou prazo gera nova versão e volta o modelo para rascunho.
export function editarModelo(m, alteracoes = {}) {
  const novo = { ...m };
  let mudou = false;
  for (const campo of ['titulo', 'texto', 'prazo']) {
    if (campo in alteracoes && String(alteracoes[campo]) !== String(m[campo])) {
      novo[campo] = String(alteracoes[campo]);
      mudou = true;
    }
  }
  if (!mudou) return m;
  novo.versao = (m.versao || 1) + 1;
  novo.status = 'rascunho';
  novo.validadoPor = null;
  novo.validadoEm = null;
  novo.conferencia = null;
  return novo;
}

export function validarModelo(m, { por, em }) {
  const erros = problemasDoModelo(m);
  if (!String(por || '').trim()) erros.push('Informe quem validou o modelo pelo juízo.');
  if (erros.length) return { ok: false, erros, modelo: m };
  const novo = { ...m, status: 'validado_pelo_juizo', validadoPor: String(por).trim(), validadoEm: em };
  novo.conferencia = impressaoDigital(conteudoValidado(novo));
  return { ok: true, erros: [], modelo: novo };
}

export function modeloValidado(m) {
  return !!m && m.status === 'validado_pelo_juizo' && m.conferencia === impressaoDigital(conteudoValidado(m))
    && problemasDoModelo(m).length === 0;
}

// O inciso marcado para revisão só se habilita com modelo validado.
export function incisoHabilitado(itemCatalogo, modelos) {
  if (!itemCatalogo) return false;
  if (!itemCatalogo.revisar) return true;
  return (modelos || []).some((m) => m.inciso === itemCatalogo.inciso && modeloValidado(m));
}

export function exportarModelos(modelos, dataHora) {
  return JSON.stringify({ tipo: 'modelos-atos-ordinatorios', versaoFormato: 1, exportadoEm: dataHora, modelos }, null, 2);
}

// Importa modelos de um .json. Modelo validado cujo conteúdo não confere volta para rascunho.
// Modelo que contenha documento vedado é recusado.
export function importarModelos(texto) {
  const avisos = [];
  let dados;
  try { dados = JSON.parse(texto); } catch (e) { return { modelos: [], avisos: ['Arquivo inválido: não é um JSON.'] }; }
  const lista = Array.isArray(dados) ? dados : dados?.modelos;
  if (!Array.isArray(lista)) return { modelos: [], avisos: ['Arquivo sem lista de modelos.'] };
  const modelos = [];
  for (const bruto of lista) {
    if (!bruto || !buscarInciso(bruto.inciso)) { avisos.push('Modelo ignorado: inciso inexistente.'); continue; }
    const m = {
      ...criarModelo({ id: bruto.id, inciso: bruto.inciso, titulo: bruto.titulo, texto: bruto.texto, prazo: bruto.prazo }),
      status: bruto.status === 'validado_pelo_juizo' ? 'validado_pelo_juizo' : 'rascunho',
      validadoPor: bruto.validadoPor || null,
      validadoEm: bruto.validadoEm || null,
      versao: Number.isInteger(bruto.versao) && bruto.versao > 0 ? bruto.versao : 1,
      conferencia: bruto.conferencia || null,
    };
    if (vedacoesNoTexto(m.texto).length) { avisos.push(`Modelo "${m.titulo || m.id}" recusado: contém documento vedado à secretaria.`); continue; }
    if (m.status === 'validado_pelo_juizo' && !modeloValidado(m)) {
      avisos.push(`Modelo "${m.titulo || m.id}": conteúdo diferente do validado; voltou para rascunho.`);
      m.status = 'rascunho'; m.validadoPor = null; m.validadoEm = null; m.conferencia = null;
    }
    modelos.push(m);
  }
  return { modelos, avisos };
}

// Modelo de demonstração que acompanha a v1, em rascunho (inciso XV).
export function modeloExemploXV() {
  return criarModelo({
    id: 'exemplo-XV-1',
    inciso: 'XV',
    titulo: 'Prosseguimento após suspensão (exemplo)',
    texto: 'ATO ORDINATÓRIO. Decorrido o prazo de suspensão deferido sem manifestação da parte interessada, fica o(a) exequente intimado(a) para dizer sobre o prosseguimento do feito, no prazo de {{prazo}}.',
    prazo: '',
  });
}
