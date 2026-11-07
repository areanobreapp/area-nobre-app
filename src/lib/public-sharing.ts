import crypto from 'crypto';
import { getWhatsAppUrl } from './whatsapp';

/**
 * Configuração institucional padrão de fallback para a Área Nobre.
 * Utilizada exclusivamente quando dados profissionais de um corretor não estiverem definidos.
 */
export const BROKER_CONFIG = {
  name: 'Corretor Responsável',
  brandName: 'Área Nobre',
  creci: '',
  phone: process.env.DEFAULT_BROKER_PHONE || '',
  formattedPhone: '',
  email: '',
  city: 'Criciúma - SC',
  tagline: 'Consultoria imobiliária consultiva e personalizada',
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
 * Gera um identificador público garantidamente único verificando contra
 * Property, Typology e PropertyShare no banco de dados.
 */
export async function generateUniquePublicId(prismaClient: any): Promise<string> {
  let unique = false;
  let publicId = '';
  let attempts = 0;
  const maxAttempts = 20;

  while (!unique && attempts < maxAttempts) {
    attempts++;
    publicId = generatePublicId();
    const [existingProperty, existingTypology, existingShare] = await Promise.all([
      prismaClient.property.findUnique({ where: { publicId }, select: { id: true } }),
      prismaClient.typology.findUnique({ where: { publicId }, select: { id: true } }),
      prismaClient.propertyShare.findUnique({ where: { publicId }, select: { id: true } }),
    ]);

    if (!existingProperty && !existingTypology && !existingShare) {
      unique = true;
    }
  }

  if (!unique) {
    throw new Error('Falha ao gerar identificador público único após múltiplas tentativas.');
  }

  return publicId;
}

/**
 * Retorna e normaliza a URL base da aplicação respeitando o ambiente (localhost vs homologação vs produção).
 *
 * Regras:
 * 1. Prioriza configuração explícita via APP_PUBLIC_URL ou NEXT_PUBLIC_APP_URL.
 * 2. Em ambiente de homologação remoto na Vercel (se VERCEL_URL estiver disponível e a URL explícita não tiver sido configurada),
 *    utiliza https://${VERCEL_URL} para evitar fallback silencioso para localhost.
 * 3. Sanitiza espaços e barras finais.
 * 4. Mantém http://localhost:3000 como fallback seguro padrão de desenvolvimento local.
 */
export function getAppBaseUrl(): string {
  const isHomologation =
    process.env.APP_ENV === 'homologation' ||
    process.env.NEXT_PUBLIC_APP_ENV === 'homologation';

  const rawUrl = (process.env.APP_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (rawUrl) {
    return rawUrl.replace(/\/+$/, '');
  }

  if (isHomologation && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
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
 * Destinatário: Telefone profissional do corretor que apresenta o imóvel.
 * Formato: "Olá, [Nome]! Tenho interesse no imóvel "[Título]": [URL]"
 */
export function getContactBrokerWhatsAppUrl(
  propertyTitle: string,
  publicUrl: string,
  brokerPhone?: string | null,
  brokerName?: string | null
): string | null {
  const phone = (brokerPhone || BROKER_CONFIG.phone || '').replace(/\D/g, '');
  if (!phone) {
    return null;
  }
  const name = brokerName
    ? (brokerName.startsWith('Corretor ') ? brokerName : brokerName.split(' ')[0])
    : 'Corretor';
  const message = `Olá, ${name}! Tenho interesse no imóvel "${propertyTitle}":\n${publicUrl}`;
  return getWhatsAppUrl(phone, message) || `https://wa.me/55${phone}`;
}
