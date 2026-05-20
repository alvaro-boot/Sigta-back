/** Normaliza a dígitos E.164 sin + (ej. 573001234567 para Colombia). */
export function normalizeWhatsAppPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('3')) d = `57${d}`;
  if (d.length === 11 && d.startsWith('57')) return d;
  if (d.length >= 11 && d.length <= 15) return d;
  return null;
}
