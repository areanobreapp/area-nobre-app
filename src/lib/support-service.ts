import { prisma } from './db';
import {
  DEFAULT_SUPPORT_WHATSAPP,
  DEFAULT_SUPPORT_MESSAGE,
  LOGIN_SUPPORT_MESSAGE,
  normalizeBrazilianPhone,
  formatBrazilianPhoneDisplay,
} from './whatsapp';

export const SUPPORT_SETTING_KEY = 'SUPPORT_WHATSAPP_NUMBER';

export interface SupportContactDTO {
  phone: string;
  formattedPhone: string;
  message: string;
  loginMessage: string;
}

/**
 * Obtém o número de suporte configurado no banco de dados.
 * Se ainda não houver configuração persistida, retorna o número fallback inicial (5548999273694).
 * Não faz gravação repetida no banco a cada leitura.
 */
export async function getSupportPhoneSetting(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SUPPORT_SETTING_KEY },
      select: { value: true },
    });

    if (setting?.value) {
      const normalized = normalizeBrazilianPhone(setting.value);
      if (normalized) {
        return normalized;
      }
    }
  } catch (error) {
    console.error('[support-service] Erro ao consultar número de suporte no banco:', error);
  }

  return DEFAULT_SUPPORT_WHATSAPP;
}

/**
 * Atualiza o número de WhatsApp de suporte no banco de dados.
 * Valida o número contra regras de telefone brasileiro antes de persistir.
 */
export async function setSupportPhoneSetting(
  rawPhone: string,
  updatedByUserId?: string
): Promise<{ success: boolean; phone?: string; formattedPhone?: string; error?: string }> {
  const normalized = normalizeBrazilianPhone(rawPhone);

  if (!normalized) {
    return {
      success: false,
      error: 'Número de WhatsApp inválido. Informe um telefone brasileiro com DDD válido (ex: 48 99927-3694).',
    };
  }

  try {
    const updated = await prisma.systemSetting.upsert({
      where: { key: SUPPORT_SETTING_KEY },
      update: {
        value: normalized,
        updatedBy: updatedByUserId || null,
      },
      create: {
        key: SUPPORT_SETTING_KEY,
        value: normalized,
        description: 'WhatsApp oficial de suporte da Área Nobre configurado pelo Administrador',
        updatedBy: updatedByUserId || null,
      },
    });

    return {
      success: true,
      phone: updated.value,
      formattedPhone: formatBrazilianPhoneDisplay(updated.value),
    };
  } catch (error) {
    console.error('[support-service] Falha ao gravar número de suporte:', error);
    return {
      success: false,
      error: 'Erro interno ao salvar configuração no banco de dados.',
    };
  }
}

/**
 * Retorna o DTO público com as informações de contato para os componentes da interface.
 */
export async function getSupportContactDTO(): Promise<SupportContactDTO> {
  const phone = await getSupportPhoneSetting();
  return {
    phone,
    formattedPhone: formatBrazilianPhoneDisplay(phone),
    message: DEFAULT_SUPPORT_MESSAGE,
    loginMessage: LOGIN_SUPPORT_MESSAGE,
  };
}
