// Máscara de processo sigiloso, no padrão já usado pela lista de ordem cronológica de julgamento do TJPA:
// NNNNNNN-DD.AAAA.J.TR.OOOO  ->  Sigiloso-DD.AAAA.J.TR.OOOO

const RE_CNJ_PARTES = /^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/;

export function mascararNumero(numero) {
  const m = String(numero || '').trim().match(RE_CNJ_PARTES);
  if (!m) return 'Sigiloso';
  return `Sigiloso-${m[2]}.${m[3]}.${m[4]}.${m[5]}.${m[6]}`;
}

// Número para exportação pública (CSV, impressão): mascara quando o processo é sigiloso.
export function numeroPublico(processo) {
  return processo && processo.sigiloso ? mascararNumero(processo.numero) : String(processo?.numero || '');
}
