/**
 * Gera um UUID v4 de forma segura
 * Funciona em ambientes com ou sem suporte a crypto.randomUUID
 */
export function generateUUID(): string {
  // Tentar usar crypto.randomUUID se disponível
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      console.warn('crypto.randomUUID falhou, usando fallback:', e);
    }
  }

  // Fallback: gerar UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gera um ID seguro com prefixo (ex: BEB001, REF001)
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

/**
 * Sanitiza nome para ID interno válido
 */
export function sanitizeIdName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);
}
