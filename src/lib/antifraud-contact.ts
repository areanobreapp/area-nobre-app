/**
 * Utilitários e regras de segurança para o Aviso Antifraude (Ponto 20 / Etapa 1.6).
 * Controla a exibição única por visita (via sessionStorage) e valida a integridade
 * das URLs oficiais de contato por WhatsApp.
 */

export const ANTIFRAUD_STORAGE_KEY = 'areanobre_antifraud_notice_dismissed';

/**
 * Valida de forma estrita se a URL de destino é um link oficial e seguro do WhatsApp.
 * Aceita exclusivamente conexões HTTPS para wa.me ou api.whatsapp.com.
 * Rejeita qualquer outro domínio, protocolo ou esquemas maliciosos como javascript:.
 */
export function isSafeWhatsAppUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'wa.me' || hostname === 'api.whatsapp.com';
  } catch {
    return false;
  }
}

/**
 * Verifica se o aviso antifraude já foi concluído nesta visita (sessão do navegador).
 * Resiliente a ambientes onde sessionStorage possa estar bloqueado (ex: modo anônimo restrito).
 */
export function hasSeenAntifraudNoticeThisVisit(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.sessionStorage.getItem(ANTIFRAUD_STORAGE_KEY) === 'true';
  } catch {
    // Se sessionStorage não estiver acessível, retorna false para apresentar o aviso com segurança
    return false;
  }
}

/**
 * Marca que o aviso antifraude foi concluído para esta visita.
 */
export function markAntifraudNoticeDismissed(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(ANTIFRAUD_STORAGE_KEY, 'true');
  } catch {
    // Falha silenciosa em caso de restrição do navegador; não impede o fluxo
  }
}

/**
 * Limpa o registro da visita (útil para testes e reinicialização de sessão).
 */
export function clearAntifraudNoticeSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(ANTIFRAUD_STORAGE_KEY);
  } catch {
    // Ignora
  }
}
