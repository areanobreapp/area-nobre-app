/**
 * Helper centralizado para normalização de telefones brasileiros e links do WhatsApp
 * Fase 5.2 — Ferramentas Operacionais
 */

/**
 * Normaliza qualquer formato de telefone brasileiro para formato E.164 sem o sinal de + (apenas dígitos).
 * Ex: 5548999991234
 * 
 * Trata:
 * - Parênteses, traços, espaços, pontos
 * - Prefixos +55 ou 55 já existentes
 * - Números de 10 dígitos (DDD + 8 dígitos) -> adiciona 55
 * - Números de 11 dígitos (DDD + 9 dígitos) -> adiciona 55
 * - Validações de tamanho e DDD brasileiro válido (11 a 99)
 * 
 * Retorna null se o telefone for nulo, indefinido, vazio ou inválido.
 */
export function normalizeBrazilianPhone(rawPhone?: string | null): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return null;
  }

  // Remove tudo que não for dígito
  const digits = rawPhone.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  // Rejeita sequências triviais inválidas como "0000000000" ou "1111111111"
  if (/^(\d)\1+$/.test(digits)) {
    return null;
  }

  let finalNumber = digits;

  // Se já possui código do Brasil (55) no início e tem 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    finalNumber = digits;
  } else if (digits.length === 10 || digits.length === 11) {
    // DDD + 8 ou 9 dígitos sem o DDI 55
    finalNumber = `55${digits}`;
  } else {
    // Tamanho incompatível com telefone brasileiro
    return null;
  }

  // Validar DDD (os dígitos após o 55)
  const ddd = parseInt(finalNumber.slice(2, 4), 10);
  if (isNaN(ddd) || ddd < 11 || ddd > 99) {
    return null;
  }

  return finalNumber;
}

/**
 * Gera URL oficial do WhatsApp (wa.me) para abertura direta da conversa.
 * Opcionalmente aceita uma mensagem inicial pré-preenchida (para uso futuro na Fase 5.3).
 * 
 * Retorna null se o telefone for inválido.
 */
export function getWhatsAppUrl(
  phone?: string | null,
  initialMessage?: string | null
): string | null {
  const normalized = normalizeBrazilianPhone(phone);
  if (!normalized) {
    return null;
  }

  const baseUrl = `https://wa.me/${normalized}`;
  if (initialMessage && initialMessage.trim().length > 0) {
    return `${baseUrl}?text=${encodeURIComponent(initialMessage.trim())}`;
  }

  return baseUrl;
}

/**
 * Constantes oficiais para o canal de suporte da Área Nobre (Ponto 13)
 */
export const DEFAULT_SUPPORT_WHATSAPP = '5548999273694';
export const DEFAULT_SUPPORT_MESSAGE = 'Olá! Preciso de ajuda com a Área Nobre.';
export const LOGIN_SUPPORT_MESSAGE = 'Olá! Preciso de ajuda para acessar a Área Nobre.';

/**
 * Formata um número brasileiro para exibição amigável na interface:
 * Ex: 5548999273694 -> (48) 99927-3694
 */
export function formatBrazilianPhoneDisplay(phone?: string | null): string {
  if (!phone) return '';
  const normalized = normalizeBrazilianPhone(phone);
  if (!normalized) return phone;

  const ddd = normalized.slice(2, 4);
  const rest = normalized.slice(4);
  if (rest.length === 9) {
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  } else if (rest.length === 8) {
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return normalized;
}
