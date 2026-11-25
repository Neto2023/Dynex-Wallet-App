// Exportações locais. Nada é enviado: os arquivos são gerados no navegador e baixados pelo próprio usuário.

export function celulaCSV(v, sep = ';') {
  const s = v === null || v === undefined ? '' : String(v);
  if (s.includes('"') || s.includes(sep) || /[\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// CSV com ponto e vírgula e BOM, para abrir direto no Excel em português.
export function paraCSV(cabecalho, linhas, sep = ';') {
  const out = [cabecalho, ...linhas].map((l) => l.map((c) => celulaCSV(c, sep)).join(sep));
  return '﻿' + out.join('\r\n') + '\r\n';
}

export function carimboArquivo(dt = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}_${p(dt.getHours())}${p(dt.getMinutes())}`;
}

export function baixarArquivo(nome, conteudo, tipo = 'text/plain;charset=utf-8') {
  if (typeof document === 'undefined') return;
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function lerArquivoTexto(arquivo) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error);
    r.readAsText(arquivo, 'utf-8');
  });
}

export async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (e) { /* cai no método alternativo */ }
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}

// Preferências de interface (nunca dados de processo). Sempre em try/catch.
export function prefLer(chave, padrao) {
  try {
    const v = window.localStorage.getItem('oab-maraba-serventia:' + chave);
    return v === null ? padrao : JSON.parse(v);
  } catch (e) {
    return padrao;
  }
}

export function prefGravar(chave, valor) {
  try {
    window.localStorage.setItem('oab-maraba-serventia:' + chave, JSON.stringify(valor));
  } catch (e) { /* sem armazenamento: segue sem lembrar a preferência */ }
}

export function escaparHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
