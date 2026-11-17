import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getAppBaseUrl } from '@/lib/public-sharing';
import { normalizeBrazilianPhone, getWhatsAppUrl, formatBrazilianPhoneDisplay } from '@/lib/whatsapp';
import { formatPricePerSqmDetailed, formatUnitFloor } from '@/lib/commercial-unit-format';
import { resolvePublicationStatus } from '@/lib/development-visibility';
import { computePricePerSqm } from '@/lib/commercial-unit-rules';

const SHARE_SECRET =
  process.env.COMMERCIAL_SHARE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'area-nobre-dev-secret-commercial-share-2026';

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

export interface ResolvedCommercialUnitShare {
  isAvailable: boolean;
  unavailabilityReason?: string;
  data?: PublicCommercialUnitData;
}

/**
 * Cria um token seguro, compacto e URL-safe codificado em base64url e assinado com HMAC-SHA256.
 * Não requer colunas adicionais no banco e é matematicamente inviolável.
 */
export function createCommercialUnitShareToken(
  unitId: string,
  developmentId: string,
  brokerId: string
): string {
  const payload: CommercialUnitSharePayload = {
    u: unitId,
    d: developmentId,
    b: brokerId,
    t: Date.now(),
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');

  const signature = crypto
    .createHmac('sha256', SHARE_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Valida a integridade criptográfica do token e extrai o payload com segurança.
 * Retorna null se a assinatura for inválida ou o token for adulterado.
 */
export function verifyCommercialUnitShareToken(token: string): CommercialUnitSharePayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SHARE_SECRET)
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

/**
 * Consulta em tempo real e resolve os dados públicos da unidade compartilhada.
 * - Verifica assinatura do token.
 * - Valida status ativo do corretor.
 * - Valida publicação do empreendimento.
 * - Filtra estritamente os campos autorizados para divulgação pública.
 * - NUNCA expõe o estoque completo de outras unidades.
 */
export async function resolvePublicCommercialUnit(
  token: string
): Promise<ResolvedCommercialUnitShare> {
  const payload = verifyCommercialUnitShareToken(token);

  if (!payload) {
    return {
      isAvailable: false,
      unavailabilityReason: 'Link de compartilhamento inválido ou expirado.',
    };
  }

  const { u: unitId, d: developmentId, b: brokerId } = payload;

  // 1. Busca o corretor responsável pelo link
  const brokerUser = await prisma.user.findUnique({
    where: { id: brokerId },
    include: { profile: true },
  });

  if (!brokerUser) {
    return {
      isAvailable: false,
      unavailabilityReason: 'Corretor responsável não encontrado.',
    };
  }

  if (brokerUser.status !== 'ACTIVE') {
    return {
      isAvailable: false,
      unavailabilityReason: 'Corretor responsável indisponível no momento.',
    };
  }

  // 2. Busca a unidade comercial vinculada ao empreendimento
  const unit = await prisma.commercialUnit.findFirst({
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
      unavailabilityReason: 'Unidade comercial não encontrada.',
    };
  }

  const dev = unit.development;

  // 3. Verifica se o empreendimento está publicado
  const pubStatus = resolvePublicationStatus(dev.status);
  if (pubStatus !== 'PUBLICADO') {
    return {
      isAvailable: false,
      unavailabilityReason: 'Este empreendimento não está disponível para consulta pública no momento.',
    };
  }

  // 4. Formata dados do corretor
  const profile = brokerUser.profile;
  const brokerName = profile?.commercialName?.trim() || brokerUser.name?.trim() || 'Corretor de Imóveis';
  const rawPhone = profile?.phone || null;
  const normalizedPhone = normalizeBrazilianPhone(rawPhone);
  const formattedPhone = formatBrazilianPhoneDisplay(rawPhone);
  const hasWhatsApp = Boolean(normalizedPhone);

  const suggestedMessage = `Olá! Gostaria de saber mais sobre a unidade ${unit.unitCode} do empreendimento ${dev.name}.`;
  const whatsappUrl = hasWhatsApp ? getWhatsAppUrl(normalizedPhone, suggestedMessage) : null;

  // 5. Preço vigente e cálculo por m² privativo
  const currentPrice = unit.promotionalPrice && unit.promotionalPrice > 0 ? unit.promotionalPrice : unit.listPrice;
  const computedSqm = computePricePerSqm(unit);
  const pricePerSqmText = formatPricePerSqmDetailed({
    pricePerSqm: computedSqm.pricePerSqm,
    referenceArea: computedSqm.referenceArea,
    referenceAreaLabel: computedSqm.referenceAreaLabel,
  });

  // 6. Condições comerciais oficiais da construtora com resolução de escopo e descarte de vencidas
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
  const rawConditions = await prisma.commercialPaymentCondition.findMany({
    where: {
      developmentId: unit.developmentId,
      isActive: true,
      OR: orScopes,
      AND: [
        {
          OR: [
            { validUntil: null },
            { validUntil: { gte: now } },
          ],
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

  const sortedConditions = rawConditions.sort((a, b) => scopePriority(a) - scopePriority(b));

  // 7. Montagem dos dados públicos rigorosamente filtrados
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
              fileUrl: m.fileUrl,
              fileType: m.fileType,
              fileExtension: m.fileExtension,
              fileSizeBytes: m.fileSizeBytes,
              displayOrder: m.displayOrder,
              allowDownload: m.allowDownload !== false,
            })),
          }
        : null,
      paymentConditions: sortedConditions.map((c) => ({
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
    broker: {
      id: brokerUser.id,
      name: brokerUser.name || 'Corretor Responsável',
      commercialName: brokerName,
      avatarUrl: profile?.avatarUrl || null,
      creci: profile?.creci || null,
      city: profile?.city || dev.city || 'Criciúma - SC',
      tagline: profile?.tagline || null,
      phone: rawPhone,
      formattedPhone,
      hasWhatsApp,
      whatsappUrl,
      suggestedMessage,
    },
  };

  return {
    isAvailable: true,
    data: publicData,
  };
}
