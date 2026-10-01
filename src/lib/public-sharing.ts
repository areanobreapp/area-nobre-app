import crypto from 'crypto';
import { getWhatsAppUrl } from './whatsapp';

/**
 * Configuração central da operação imobiliária da Corretora Daiane Corrêa.
 * Utilizada na identidade pública, página compartilhável e contato profissional.
 */
export const BROKER_CONFIG = {
  name: 'Daiane Corrêa',
  brandName: 'Daiane Corrêa Imóveis',
  creci: 'CRECI-SC 48.912',
  phone: process.env.DAIANE_WHATSAPP_PHONE || '48999887766',
  formattedPhone: '(48) 99988-7766',
  email: 'contato@daianecorrea.com.br',
  city: 'Criciúma - SC',
  tagline: 'Consultoria Imobiliária Exclusiva em Criciúma e Região',
};

/**
 * Gera identificador público aleatório, não previsível e seguro para URL.
 * Exemplo: 'X7K4M2A9' (8 caracteres alfanuméricos)
 */
export function generatePublicId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const bytes = crypto.randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

/**
 * Retorna a URL base da aplicação respeitando o ambiente (localhost vs produção).
 */
export function getAppBaseUrl(): string {
  if (process.env.APP_PUBLIC_URL && process.env.APP_PUBLIC_URL.trim() !== '') {
    return process.env.APP_PUBLIC_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim() !== '') {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

/**
 * Retorna a URL pública completa para compartilhamento do imóvel.
 */
export function getPublicPropertyUrl(publicId: string): string {
  const base = getAppBaseUrl();
  return `${base}/p/imovel/${publicId}`;
}

/**
 * Gera URL do WhatsApp para a corretora enviar o link do imóvel para o cliente.
 * Formato: "Olá, [Nome]! Separei este imóvel para você: [URL]"
 */
export function getShareWithClientWhatsAppUrl(
  clientPhone: string | null | undefined,
  clientName: string | null | undefined,
  publicUrl: string
): string | null {
  if (!clientPhone) return null;
  const firstName = (clientName || 'Cliente').trim().split(' ')[0];
  const message = `Olá, ${firstName}! Separei este imóvel para você:\n${publicUrl}`;
  return getWhatsAppUrl(clientPhone, message);
}

/**
 * Gera URL do WhatsApp no botão público "Tenho interesse / Falar com [Corretor]".
 * Destinatário: Telefone Profissional do corretor responsável pelo imóvel.
 * Formato: "Olá, [Nome]! Tenho interesse no imóvel "[Título]": [URL]"
 */
export function getContactBrokerWhatsAppUrl(
  propertyTitle: string,
  publicUrl: string,
  brokerPhone?: string | null,
  brokerName?: string | null
): string {
  const phone = (brokerPhone || BROKER_CONFIG.phone).replace(/\D/g, '');
  const name = brokerName ? brokerName.split(' ')[0] : 'Corretor';
  const message = `Olá, ${name}! Tenho interesse no imóvel "${propertyTitle}":\n${publicUrl}`;
  return getWhatsAppUrl(phone, message) || `https://wa.me/55${phone}`;
}
