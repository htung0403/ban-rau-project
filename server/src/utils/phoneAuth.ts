/** Chuẩn hóa SĐT (E.164) khi cần so khớp / hiển thị. */
export function normalizePhoneForAuth(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) throw new Error('Phone is required');
  if (digits.startsWith('84')) return `+${digits}`;
  if (digits.startsWith('0')) return `+84${digits.slice(1)}`;
  if (digits.startsWith('9') && digits.length === 9) return `+84${digits}`;
  return `+${digits}`;
}

export function buildPhoneCandidates(rawPhone: string): string[] {
  const raw = (rawPhone || '').trim();
  const digits = raw.replace(/\D/g, '');
  const candidates = new Set<string>([raw, digits]);

  if (digits.startsWith('84') && digits.length >= 10) {
    candidates.add(`+${digits}`);
    candidates.add(`0${digits.slice(2)}`);
  } else if (digits.startsWith('0') && digits.length >= 10) {
    candidates.add(`84${digits.slice(1)}`);
    candidates.add(`+84${digits.slice(1)}`);
  }

  return Array.from(candidates).filter(Boolean);
}
