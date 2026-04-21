export function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeQuery(str: string): string {
  return removeAccents(str).toLowerCase().trim();
}

export function matchesSearch(target: string, query: string): boolean {
  if (!query) return true;
  
  const normalizedTarget = normalizeQuery(target);
  const normalizedQuery = normalizeQuery(query);
  
  return normalizedTarget.includes(normalizedQuery);
}
