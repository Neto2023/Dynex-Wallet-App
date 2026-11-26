// Datas sem fuso horário. Toda data circula como texto local "AAAA-MM-DDTHH:MM:SS".
// A contagem de dias usa apenas a parte da data, convertida para um número serial (dias desde 1970-01-01).

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function dataValida(a, m, d) {
  if (!(a >= 1900 && a <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function montarISO(a, m, d, h = 0, mi = 0, s = 0) {
  return `${a}-${pad2(m)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:${pad2(s)}`;
}

function horaValida(h, mi, s) {
  return h >= 0 && h <= 23 && mi >= 0 && mi <= 59 && s >= 0 && s <= 59;
}

// dd/mm/aaaa com hora opcional (hh:mm ou hh:mm:ss), separada por espaço, vírgula, "às" ou hífen.
const RE_DATA_BR = /(?<!\d)(\d{2})\/(\d{2})\/(\d{4})(?:\s*(?:,|às|as|-)?\s*(\d{2}):(\d{2})(?::(\d{2}))?)?(?!\d)/g;

export function extrairDatas(texto) {
  const out = [];
  const s = String(texto ?? '');
  for (const m of s.matchAll(RE_DATA_BR)) {
    const d = +m[1], mes = +m[2], a = +m[3];
    if (!dataValida(a, mes, d)) continue;
    let h = 0, mi = 0, se = 0;
    if (m[4] !== undefined) {
      h = +m[4]; mi = +m[5]; se = m[6] !== undefined ? +m[6] : 0;
      if (!horaValida(h, mi, se)) { h = 0; mi = 0; se = 0; }
    }
    out.push({ iso: montarISO(a, mes, d, h, mi, se), texto: m[0], indice: m.index });
  }
  return out;
}

// Aceita "dd/mm/aaaa[ hh:mm[:ss]]" ou "aaaa-mm-dd[(T| )hh:mm[:ss]]". Devolve ISO local ou null.
export function lerData(texto) {
  const s = String(texto ?? '').trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    const a = +iso[1], m = +iso[2], d = +iso[3];
    if (!dataValida(a, m, d)) return null;
    const h = iso[4] ? +iso[4] : 0, mi = iso[5] ? +iso[5] : 0, se = iso[6] ? +iso[6] : 0;
    if (!horaValida(h, mi, se)) return null;
    return montarISO(a, m, d, h, mi, se);
  }
  const br = extrairDatas(s);
  return br.length ? br[0].iso : null;
}

export function partesISO(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return { a: +m[1], m: +m[2], d: +m[3], h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0, s: m[6] ? +m[6] : 0 };
}

export function diaSerial(iso) {
  const p = partesISO(iso);
  if (!p) return null;
  return Math.round(Date.UTC(p.a, p.m - 1, p.d) / 86400000);
}

export function serialParaDia(serial) {
  const dt = new Date(serial * 86400000);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

// 0 = domingo ... 6 = sábado
export function diaDaSemana(serial) {
  return new Date(serial * 86400000).getUTCDay();
}

export function formatarDataBR(iso, { hora = true } = {}) {
  const p = partesISO(iso);
  if (!p) return '';
  const data = `${pad2(p.d)}/${pad2(p.m)}/${p.a}`;
  if (!hora || (p.h === 0 && p.mi === 0 && p.s === 0)) return data;
  return `${data} ${pad2(p.h)}:${pad2(p.mi)}`;
}

export function agoraISO(dt = new Date()) {
  return montarISO(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds());
}

export function hojeISO(dt = new Date()) {
  return montarISO(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}
