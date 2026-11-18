import crypto from 'crypto';
import { prisma as defaultPrisma } from '@/lib/db';
import { getAppBaseUrl } from '@/lib/public-sharing';
import { normalizeBrazilianPhone, getWhatsAppUrl, formatBrazilianPhoneDisplay } from '@/lib/whatsapp';
import { formatPricePerSqmDetailed, formatUnitFloor } from '@/lib/commercial-unit-format';
import { isDevelopmentPubliclyShareable } from '@/lib/development-visibility';
import { computePricePerSqm } from '@/lib/commercial-unit-rules';

export const MIN_COMMERCIAL_SHARE_SECRET_LENGTH = 32;
export const MIN_COMMERCIAL_SHARE_SECRET_UNIQUE_CHARS = 8;

const FORBIDDEN_WEAK_SHARE_SECRETS = new Set([
  'area-nobre-dev-secret-commercial-share-2026',
  'area-nobre-secret-key-development-2026',
  'changeme',
  'secret',
  'default',
]);

export class CommercialShareConfigError extends Error {
  public readonly code = 'SHARE_SECRET_MISCONFIGURED';
  constructor(message = 'Serviço de compartilhamento temporariamente indisponível.') {
    super(message);
    this.name = 'CommercialShareConfigError';
  }
}

export interface ShareSecretValidationResult {
  valid: boolean;
  secret?: string;
  reason?: 'MISSING' | 'TOO_SHORT' | 'LOW_ENTROPY' | 'FORBIDDEN_VALUE';
}

/**
 * Valida estritamente o segredo de assinatura exigindo exclusivamente COMMERCIAL_SHARE_SECRET (SEG-01).
 * Nunca faz fallback para NEXTAUTH_SECRET ou chaves fixas no código e jamais expõe o valor nos logs.
 */
export function validateCommercialShareSecret(
  rawSecret: string | undefined = process.env.COMMERCIAL_SHARE_SECRET
): ShareSecretValidationResult {
  if (!rawSecret || typeof rawSecret !== 'string') {
    return { valid: false, reason: 'MISSING' };
  }

  const trimmed = rawSecret.trim();
  if (!trimmed) {
    return { valid: false, reason: 'MISSING' };
  }

  if (
    FORBIDDEN_WEAK_SHARE_SECRETS.has(trimmed.toLowerCase()) ||
    trimmed.includes('[YOUR-') ||
    trimmed.includes('PLACEHOLDER')
  ) {
    return { valid: false, reason: 'FORBIDDEN_VALUE' };
  }

  if (trimmed.length < MIN_COMMERCIAL_SHARE_SECRET_LENGTH) {
    return { valid: false, reason: 'TOO_SHORT' };
  }

  const uniqueChars = new Set(trimmed).size;
  if (uniqueChars < MIN_COMMERCIAL_SHARE_SECRET_UNIQUE_CHARS) {
    return { valid: false, reason: 'LOW_ENTROPY' };
  }

  return { valid: true, secret: trimmed };
}

function getRequiredCommercialShareSecret(): string {
  const check = validateCommercialShareSecret(process.env.COMMERCIAL_SHARE_SECRET);
  if (!check.valid || !check.secret) {
    console.error(
      `[CommercialUnitShare Security] COMMERCIAL_SHARE_SECRET inválido ou ausente (motivo: ${check.reason}). Operação bloqueada.`
    );
    throw new CommercialShareConfigError(
      'Serviço de compartilhamento temporariamente indisponível.'
    );
  }
  return check.secret;
}

export type CommercialUnitUnavailabilityCode =
  | 'INVALID_TOKEN'
  | 'BROKER_NOT_FOUND'
  | 'BROKER_INACTIVE'
  | 'UNIT_NOT_FOUND'
  | 'DEVELOPMENT_UNAVAILABLE'
  | 'UNIT_SOLD'
  | 'UNIT_TEMPORARILY_UNAVAILABLE'
  | 'UNIT_UNAVAILABLE';

export interface CommercialUnitShareStatusEvaluation {
  canCreateShare: boolean;
  isPubliclyActive: boolean;
  isReserved: boolean;
  unavailabilityCode?: CommercialUnitUnavailabilityCode;
  unavailabilityTitle?: string;
  unavailabilityReason?: string;
  shareBlockedError?: string;
}

/**
 * Avalia as regras aprovadas de disponibilidade comercial para compartilhamento (FUNC-01):
 * - DISPONIVEL: permite gerar links e abrir links existentes normalmente.
 * - RESERVADA: permite gerar links e abrir links existentes com aviso explícito de reserva (não disponível para aquisição imediata).
 * - VENDIDA: impede gerar novos links; links existentes exibem página amigável de unidade comercializada sem ficha comercial/preço.
 * - INDISPONIVEL_TEMPORARIAMENTE: impede gerar novos links; links existentes exibem página amigável de indisponibilidade temporária sem ficha comercial/preço.
 * - Demais status futuros/desconhecidos: tratados de forma segura impedindo novos links e ocultando oferta ativa.
 */
export function evaluateCommercialUnitShareStatus(
  rawStatus?: string | null
): CommercialUnitShareStatusEvaluation {
  const status = (rawStatus || '').trim().toUpperCase();

  if (status === 'DISPONIVEL') {
    return {
      canCreateShare: true,
      isPubliclyActive: true,
      isReserved: false,
    };
  }

  if (status === 'RESERVADA') {
    return {
      canCreateShare: true,
      isPubliclyActive: true,
      isReserved: true,
    };
  }

  if (status === 'VENDIDA') {
    return {
      canCreateShare: false,
      isPubliclyActive: false,
      isReserved: false,
      unavailabilityCode: 'UNIT_SOLD',
      unavailabilityTitle: 'Unidade Indisponível',
      unavailabilityReason:
        'Esta unidade já foi comercializada e não está mais disponível. Entre em contato com o corretor responsável para consultar outras opções.',
      shareBlockedError:
        'Esta unidade consta como vendida e não permite a geração de novos links de compartilhamento.',
    };
  }

  if (status === 'INDISPONIVEL_TEMPORARIAMENTE') {
    return {
      canCreateShare: false,
      isPubliclyActive: false,
      isReserved: false,
      unavailabilityCode: 'UNIT_TEMPORARILY_UNAVAILABLE',
      unavailabilityTitle: 'Indisponível Temporariamente',
      unavailabilityReason:
        'Esta unidade encontra-se temporariamente indisponível para comercialização no momento. Consulte o corretor responsável para mais informações.',
      shareBlockedError:
        'Esta unidade está temporariamente indisponível e não permite a geração de novos links de compartilhamento.',
    };
  }

  return {
    canCreateShare: false,
    isPubliclyActive: false,
    isReserved: false,
    unavailabilityCode: 'UNIT_UNAVAILABLE',
    unavailabilityTitle: 'Unidade Indisponível',
    unavailabilityReason:
      'Esta unidade não está disponível para consulta pública no momento.',
    shareBlockedError:
      'Esta unidade não está disponível para compartilhamento no momento.',
  };
}


export interface CommercialUnitSharePayload {
  u: string; // unitId
  d: string; // developmentId
  b: string; // brokerId
  t: number; // timestamp
}

export interface PublicCommercialUnitData {
  unit: {
    id: string;
    unitCode: string;
    unitType: string;
    floor: number | null;
    floorLabel: string;
    position: string | null;
    solarOrientation: string | null;
    usableArea: number | null;
    privateArea: number | null;
    builtArea: number | null;
    totalArea: number | null;
    landArea: number | null;
    bedrooms: number;
    suites: number;
    bathrooms: number;
    lavabos: number;
    parkingSpaces: number;
    coveredParkingSpaces: number | null;
    uncoveredParkingSpaces: number | null;
    hasBarbecue: boolean | null;
    isPenthouse: boolean;
    commercialStatus: string;
    listPrice: number | null;
    promotionalPrice: number | null;
    currentPrice: number | null;
    pricePerSqmText: string | null;
    description: string | null;
    publicNotes: string | null;
    acceptsFinancing: boolean;
    acceptsExchange: boolean;
    exchangeNotes: string | null;
    block: {
      id: string;
      name: string;
      blockType: string;
    } | null;
    typology: {
      id: string;
      name: string;
      propertyType: string;
      plants: Array<{
        id: string;
        title: string;
        fileUrl: string;
        fileType: string | null;
        fileExtension: string | null;
        fileSizeBytes: number | null;
        displayOrder: number;
        allowDownload: boolean;
      }>;
    } | null;
    paymentConditions: Array<{
      id: string;
      title: string;
      description: string | null;
      isDefault: boolean;
      downPaymentAmount: number | null;
      downPaymentPercent: number | null;
      downPaymentInstallments: number;
      monthlyCount: number | null;
      monthlyPercentTotal: number | null;
      monthlyInstallmentAmount: number | null;
      reinforcementCount: number | null;
      reinforcementFrequencyMonths: number | null;
      reinforcementPercentTotal: number | null;
      reinforcementInstallmentAmount: number | null;
      keysPercent: number | null;
      keysAmount: number | null;
      financingPercent: number | null;
      financingAmount: number | null;
      directInstallmentsPostKeys: number | null;
      correctionIndexPreKeys: string | null;
      correctionIndexPostKeys: string | null;
      acceptsExchange: boolean;
      maxExchangePercent: number | null;
      exchangeNotes: string | null;
      publicNotes: string | null;
    }>;
  };
  development: {
    id: string;
    name: string;
    projectType: string;
    stage: string;
    deliveryDate: string | null;
    deliveryYear: number | null;
    deliveryMonth: number | null;
    description: string | null;
    address: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipcode: string | null;
    latitude: number | null;
    longitude: number | null;
    hasPool: boolean;
    hasGym: boolean;
    hasPartyHall: boolean;
    hasPetSpace: boolean;
    hasElevator: boolean;
    images: Array<{
      id: string;
      url: string;
      isCover: boolean;
      caption?: string | null;
    }>;
    company: {
      id: string;
      name: string;
      tradeName: string | null;
      logoUrl: string | null;
      city: string | null;
      state: string | null;
    } | null;
  };
  broker: {
    id: string;
    name: string;
    commercialName: string;
    avatarUrl: string | null;
    creci: string | null;
    city: string | null;
    tagline: string | null;
    phone: string | null;
    formattedPhone: string;
    hasWhatsApp: boolean;
    whatsappUrl: string | null;
    suggestedMessage: string;
  };
}

export interface PublicBrokerSummary {
  id: string;
  name: string;
  commercialName: string;
  avatarUrl: string | null;
  creci: string | null;
  city: string | null;
  tagline: string | null;
  phone: string | null;
  formattedPhone: string;
  hasWhatsApp: boolean;
  whatsappUrl: string | null;
  suggestedMessage: string;
}

export interface ResolvedCommercialUnitShare {
  isAvailable: boolean;
  unavailabilityCode?: CommercialUnitUnavailabilityCode;
  unavailabilityTitle?: string;
  unavailabilityReason?: string;
  broker?: PublicBrokerSummary;
  data?: PublicCommercialUnitData;
}

/**
 * Cria um token seguro, compacto e URL-safe codificado em base64url e assinado com HMAC-SHA256.
 * Exige exclusivamente COMMERCIAL_SHARE_SECRET válido (SEG-01).
 */
export function createCommercialUnitShareToken(
  unitId: string,
  developmentId: string,
  brokerId: string
): string {
  const secret = getRequiredCommercialShareSecret();

  const payload: CommercialUnitSharePayload = {
    u: unitId,
    d: developmentId,
    b: brokerId,
    t: Date.now(),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Valida a integridade criptográfica do token e extrai o payload com segurança.
 * Retorna null se COMMERCIAL_SHARE_SECRET estiver ausente/inválido, se a assinatura for inválida
 * ou se o token for adulterado.
 */
export function verifyCommercialUnitShareToken(token: string): CommercialUnitSharePayload | null {
  if (!token || typeof token !== 'string') return null;

  const secretCheck = validateCommercialShareSecret(process.env.COMMERCIAL_SHARE_SECRET);
  if (!secretCheck.valid || !secretCheck.secret) {
    console.error(
      `[CommercialUnitShare Security] Verificação de token recusada: COMMERCIAL_SHARE_SECRET inválido ou ausente (motivo: ${secretCheck.reason}).`
    );
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', secretCheck.secret)
    .update(payloadB64)
    .digest('base64url');

  try {
    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');

    if (providedBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const parsed = JSON.parse(payloadJson) as CommercialUnitSharePayload;

    if (!parsed || !parsed.u || !parsed.d || !parsed.b) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Retorna a URL pública completa para compartilhamento da unidade.
 */
export function getPublicCommercialUnitUrl(token: string, req?: Request | null): string {
  const base = getAppBaseUrl(req);
  return `${base}/u/${token}`;
}

function buildPublicBrokerSummary(
  brokerUser: any,
  suggestedMessage: string,
  fallbackCity?: string | null
): PublicBrokerSummary {
  const profile = brokerUser?.profile;
  const brokerName =
    profile?.commercialName?.trim() || brokerUser?.name?.trim() || 'Corretor de Imóveis';
  const rawPhone = profile?.phone || null;
  const normalizedPhone = normalizeBrazilianPhone(rawPhone);
  const formattedPhone = formatBrazilianPhoneDisplay(rawPhone);
  const hasWhatsApp = Boolean(normalizedPhone);
  const whatsappUrl = hasWhatsApp ? getWhatsAppUrl(normalizedPhone, suggestedMessage) : null;

  return {
    id: brokerUser.id,
    name: brokerUser.name || 'Corretor Responsável',
    commercialName: brokerName,
    avatarUrl: profile?.avatarUrl || null,
    creci: profile?.creci || null,
    city: profile?.city || fallbackCity || 'Criciúma - SC',
    tagline: profile?.tagline || null,
    phone: rawPhone,
    formattedPhone,
    hasWhatsApp,
    whatsappUrl,
    suggestedMessage,
  };
}

/**
 * Consulta em tempo real e resolve os dados públicos da unidade compartilhada.
 * - Verifica assinatura do token com COMMERCIAL_SHARE_SECRET.
 * - Valida status ativo do corretor.
 * - Valida publicação do empreendimento e status ativo da construtora (FUNC-02).
 * - Aplica regras de disponibilidade comercial da unidade (FUNC-01).
 * - Filtra estritamente os campos autorizados para divulgação pública.
 * - NUNCA expõe o estoque completo de outras unidades nem dados internos.
 */
export async function resolvePublicCommercialUnit(
  token: string,
  prismaClient: any = defaultPrisma
): Promise<ResolvedCommercialUnitShare> {
  const payload = verifyCommercialUnitShareToken(token);

  if (!payload) {
    return {
      isAvailable: false,
      unavailabilityCode: 'INVALID_TOKEN',
      unavailabilityTitle: 'Apresentação Indisponível',
      unavailabilityReason: 'Link de compartilhamento inválido ou indisponível.',
    };
  }

  const { u: unitId, d: developmentId, b: brokerId } = payload;

  // 1. Busca o corretor responsável pelo link
  const brokerUser = await prismaClient.user.findUnique({
    where: { id: brokerId },
    include: { profile: true },
  });

  if (!brokerUser) {
    return {
      isAvailable: false,
      unavailabilityCode: 'BROKER_NOT_FOUND',
      unavailabilityTitle: 'Apresentação Indisponível',
      unavailabilityReason: 'Corretor responsável não encontrado.',
    };
  }

  if (brokerUser.status !== 'ACTIVE') {
    return {
      isAvailable: false,
      unavailabilityCode: 'BROKER_INACTIVE',
      unavailabilityTitle: 'Apresentação Indisponível',
      unavailabilityReason: 'Corretor responsável indisponível no momento.',
    };
  }

  const fallbackBrokerSummary = buildPublicBrokerSummary(
    brokerUser,
    'Olá! Gostaria de consultar imóveis e unidades disponíveis com você.'
  );

  // 2. Busca a unidade comercial vinculada ao empreendimento
  const unit = await prismaClient.commercialUnit.findFirst({
    where: {
      id: unitId,
      developmentId,
    },
    include: {
      development: {
        include: {
          company: true,
          images: {
            orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
          },
        },
      },
      block: true,
      typology: {
        include: {
          materials: {
            where: {
              category: { in: ['PLANTA_TIPOLOGIA', 'PLANTA_BAIXA', 'PLANTA'] },
              isActive: true,
              visibility: 'PUBLIC',
              allowBrokerShare: true,
            },
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
          },
        },
      },
    },
  });

  if (!unit || !unit.development) {
    return {
      isAvailable: false,
      unavailabilityCode: 'UNIT_NOT_FOUND',
      unavailabilityTitle: 'Unidade Indisponível',
      unavailabilityReason: 'Unidade comercial não encontrada.',
      broker: fallbackBrokerSummary,
    };
  }

  const dev = unit.development;

  // 3. Verifica se o empreendimento está publicado e se a construtora vinculada está ativa (FUNC-02)
  const devShareCheck = isDevelopmentPubliclyShareable(dev);
  if (!devShareCheck.allowed) {
    return {
      isAvailable: false,
      unavailabilityCode: 'DEVELOPMENT_UNAVAILABLE',
      unavailabilityTitle: 'Apresentação Indisponível',
      unavailabilityReason:
        devShareCheck.reason ||
        'Este empreendimento não está disponível para consulta pública no momento.',
      broker: buildPublicBrokerSummary(
        brokerUser,
        'Olá! Gostaria de consultar empreendimentos e unidades disponíveis.',
        dev.city
      ),
    };
  }

  // 4. Verifica disponibilidade da unidade (FUNC-01)
  // Unidades VENDIDA ou INDISPONIVEL_TEMPORARIAMENTE (ou outros status inativos)
  // não devem exibir ficha comercial ativa nem expor preços/condições.
  const statusEval = evaluateCommercialUnitShareStatus(unit.commercialStatus);
  if (!statusEval.isPubliclyActive) {
    const unavailableSuggestedMsg =
      statusEval.unavailabilityCode === 'UNIT_SOLD'
        ? `Olá! Vi que a unidade ${unit.unitCode} no ${dev.name} não está mais disponível. Gostaria de consultar outras opções semelhantes.`
        : `Olá! Gostaria de consultar informações e opções disponíveis no ${dev.name}.`;

    return {
      isAvailable: false,
      unavailabilityCode: statusEval.unavailabilityCode || 'UNIT_UNAVAILABLE',
      unavailabilityTitle: statusEval.unavailabilityTitle || 'Unidade Indisponível',
      unavailabilityReason:
        statusEval.unavailabilityReason ||
        'Esta unidade não está disponível para consulta pública no momento.',
      broker: buildPublicBrokerSummary(brokerUser, unavailableSuggestedMsg, dev.city),
    };
  }

  // 5. Formata dados do corretor para unidade disponível ou reservada
  const suggestedMessage = statusEval.isReserved
    ? `Olá! Gostaria de consultar a situação da unidade reservada ${unit.unitCode} ou outras opções no empreendimento ${dev.name}.`
    : `Olá! Gostaria de saber mais sobre a unidade ${unit.unitCode} do empreendimento ${dev.name}.`;
  const brokerSummary = buildPublicBrokerSummary(brokerUser, suggestedMessage, dev.city);

  // 6. Preço vigente e cálculo por m² privativo
  const currentPrice =
    unit.promotionalPrice && unit.promotionalPrice > 0 ? unit.promotionalPrice : unit.listPrice;
  const computedSqm = computePricePerSqm(unit);
  const pricePerSqmText = formatPricePerSqmDetailed({
    pricePerSqm: computedSqm.pricePerSqm,
    referenceArea: computedSqm.referenceArea,
    referenceAreaLabel: computedSqm.referenceAreaLabel,
  });

  // 7. Condições comerciais oficiais da construtora com resolução de escopo e descarte de vencidas
  const orScopes: any[] = [
    { commercialUnitId: unit.id },
    {
      commercialUnitId: null,
      typologyId: null,
      blockId: null,
    },
  ];

  if (unit.typologyId) {
    orScopes.push({
      commercialUnitId: null,
      typologyId: unit.typologyId,
    });
  }

  if (unit.blockId) {
    orScopes.push({
      commercialUnitId: null,
      typologyId: null,
      blockId: unit.blockId,
    });
  }

  const now = new Date();
  const rawConditions = await prismaClient.commercialPaymentCondition.findMany({
    where: {
      developmentId: unit.developmentId,
      isActive: true,
      OR: orScopes,
      AND: [
        {
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
      ],
    },
    orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const scopePriority = (c: {
    commercialUnitId: string | null;
    typologyId: string | null;
    blockId: string | null;
  }) => {
    if (c.commercialUnitId) return 1;
    if (c.typologyId) return 2;
    if (c.blockId) return 3;
    return 4;
  };

  const sortedConditions = rawConditions.sort((a: any, b: any) => scopePriority(a) - scopePriority(b));

  // 8. Montagem dos dados públicos rigorosamente filtrados (MEL-02: plantas via rota controlada /api/public/materials/[id]/view)
  const publicData: PublicCommercialUnitData = {
    unit: {
      id: unit.id,
      unitCode: unit.unitCode,
      unitType: unit.unitType,
      floor: unit.floor,
      floorLabel: formatUnitFloor(unit, true),
      position: unit.position,
      solarOrientation: unit.solarOrientation,
      usableArea: unit.usableArea,
      privateArea: unit.privateArea,
      builtArea: unit.builtArea,
      totalArea: unit.totalArea,
      landArea: unit.landArea,
      bedrooms: unit.bedrooms,
      suites: unit.suites,
      bathrooms: unit.bathrooms,
      lavabos: unit.lavabos,
      parkingSpaces: unit.parkingSpaces,
      coveredParkingSpaces: unit.coveredParkingSpaces,
      uncoveredParkingSpaces: unit.uncoveredParkingSpaces,
      hasBarbecue: unit.hasBarbecue,
      isPenthouse: unit.isPenthouse,
      commercialStatus: unit.commercialStatus,
      listPrice: unit.listPrice,
      promotionalPrice: unit.promotionalPrice,
      currentPrice,
      pricePerSqmText: computedSqm.pricePerSqm ? pricePerSqmText : null,
      description: unit.description,
      publicNotes: unit.publicNotes,
      acceptsFinancing: Boolean(unit.acceptsFinancing),
      acceptsExchange: Boolean(unit.acceptsExchange),
      exchangeNotes: unit.exchangeNotes || null,
      block: unit.block
        ? {
            id: unit.block.id,
            name: unit.block.name,
            blockType: unit.block.blockType,
          }
        : null,
      typology: unit.typology
        ? {
            id: unit.typology.id,
            name: unit.typology.name,
            propertyType: unit.typology.propertyType,
            plants: (unit.typology.materials || []).map((m: any) => ({
              id: m.id,
              title: m.title,
              fileUrl: `/api/public/materials/${m.id}/view`,
              fileType: m.fileType,
              fileExtension: m.fileExtension,
              fileSizeBytes: m.fileSizeBytes,
              displayOrder: m.displayOrder,
              allowDownload: m.allowDownload !== false,
            })),
          }
        : null,
      paymentConditions: sortedConditions.map((c: any) => ({
        id: c.id,
        title: c.name,
        description: c.description,
        isDefault: Boolean(c.isDefault),
        downPaymentAmount: c.downPaymentAmount,
        downPaymentPercent: c.downPaymentPercent,
        downPaymentInstallments: c.downPaymentInstallments || 1,
        monthlyCount: c.monthlyCount,
        monthlyPercentTotal: c.monthlyPercentTotal,
        monthlyInstallmentAmount: c.monthlyInstallmentAmount,
        reinforcementCount: c.reinforcementCount,
        reinforcementFrequencyMonths: c.reinforcementFrequencyMonths,
        reinforcementPercentTotal: c.reinforcementPercentTotal,
        reinforcementInstallmentAmount: c.reinforcementInstallmentAmount,
        keysPercent: c.keysPercent,
        keysAmount: c.keysAmount,
        financingPercent: c.financingPercent,
        financingAmount: c.financingAmount,
        directInstallmentsPostKeys: c.directInstallmentsPostKeys,
        correctionIndexPreKeys: c.correctionIndexPreKeys,
        correctionIndexPostKeys: c.correctionIndexPostKeys,
        acceptsExchange: Boolean(c.acceptsExchange),
        maxExchangePercent: c.maxExchangePercent,
        exchangeNotes: c.exchangeNotes,
        publicNotes: c.publicNotes,
      })),
    },
    development: {
      id: dev.id,
      name: dev.name,
      projectType: dev.projectType || 'VERTICAL',
      stage: dev.stage || 'Em obras',
      deliveryDate: dev.deliveryDate,
      deliveryYear: dev.deliveryYear,
      deliveryMonth: dev.deliveryMonth,
      description: dev.description,
      address: dev.address,
      number: dev.number,
      complement: dev.complement,
      neighborhood: dev.neighborhood,
      city: dev.city,
      state: dev.state,
      zipcode: dev.zipcode,
      latitude: dev.latitude,
      longitude: dev.longitude,
      hasPool: Boolean(dev.hasPool),
      hasGym: Boolean(dev.hasGym),
      hasPartyHall: Boolean(dev.hasPartyHall),
      hasPetSpace: Boolean(dev.hasPetSpace),
      hasElevator: Boolean(dev.hasElevator),
      images: (dev.images || []).map((img: any) => ({
        id: img.id,
        url: img.url,
        isCover: Boolean(img.isCover),
        caption: img.caption || null,
      })),
      company: dev.company
        ? {
            id: dev.company.id,
            name: dev.company.name,
            tradeName: dev.company.tradeName,
            logoUrl: dev.company.logoUrl,
            city: dev.company.city,
            state: dev.company.state,
          }
        : null,
    },
    broker: brokerSummary,
  };

  return {
    isAvailable: true,
    broker: brokerSummary,
    data: publicData,
  };
}

