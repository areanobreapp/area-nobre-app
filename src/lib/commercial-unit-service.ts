import { prisma as defaultPrisma } from '@/lib/db';
import type { PrismaClient, Prisma } from '@prisma/client';
import {
  type DevelopmentViewer,
  isAdminViewer,
  buildDevelopmentVisibleByIdWhere,
} from '@/lib/development-visibility';
import {
  computePricePerSqm,
  computeDiscountPercent,
  computeRoomTotals,
  computeParkingTotal,
  deriveRoomBreakdown,
  unitTypeHasBedrooms,
  unitTypeHasBathrooms,
} from '@/lib/commercial-unit-rules';

export type CommercialUnitType =
  | 'APARTAMENTO'
  | 'COBERTURA'
  | 'STUDIO'
  | 'SALA_COMERCIAL'
  | 'CASA'
  | 'LOTE';

export const VALID_COMMERCIAL_UNIT_TYPES: readonly CommercialUnitType[] = [
  'APARTAMENTO',
  'COBERTURA',
  'STUDIO',
  'SALA_COMERCIAL',
  'CASA',
  'LOTE',
] as const;

export type CommercialUnitStatus =
  | 'DISPONIVEL'
  | 'RESERVADA'
  | 'VENDIDA'
  | 'INDISPONIVEL_TEMPORARIAMENTE';

export const VALID_COMMERCIAL_UNIT_STATUSES: readonly CommercialUnitStatus[] = [
  'DISPONIVEL',
  'RESERVADA',
  'VENDIDA',
  'INDISPONIVEL_TEMPORARIAMENTE',
] as const;

export type CommercialHistorySource =
  | 'INITIAL_CREATION'
  | 'MANUAL_ADMIN'
  | 'TABLE_IMPORT'
  | 'BULK_UPDATE'
  | 'RESERVATION_EXPIRED';

export type TopographyType = 'PLANO' | 'ACLIVE' | 'DECLIVE' | 'IRREGULAR';

export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'FORBIDDEN';

type DbClient = PrismaClient | Prisma.TransactionClient;

export function createDomainError(
  message: string,
  code: DomainErrorCode = 'VALIDATION_ERROR'
): Error & { code: DomainErrorCode } {
  const err = new Error(message) as Error & { code: DomainErrorCode };
  err.code = code;
  return err;
}

export function resolveHttpErrorStatus(error: any): number {
  if (!error) return 400;
  if (error.code === 'NOT_FOUND') return 404;
  if (error.code === 'CONFLICT') return 409;
  if (error.code === 'FORBIDDEN') return 403;
  if (error.code === 'VALIDATION_ERROR') return 400;
  const msg = String(error.message || '');
  if (msg.includes('não encontrad')) return 404;
  if (msg.includes('Já existe')) return 409;
  return 400;
}

/**
 * Normaliza o código comercial da unidade para garantir unicidade determinística
 * dentro de (developmentId, blockKey, normalizedUnitCode).
 *
 * Exemplos:
 * - "Apto 302-B" -> "302b"
 * - "302 B"      -> "302b"
 * - "Unidade 101"-> "101"
 * - "Lote 15"    -> "15"
 * - "Casa 08"    -> "08"
 * - "Q02-L15"    -> "q02l15"
 */
export function normalizeCommercialUnitCode(rawCode: string): string {
  if (!rawCode || !rawCode.trim()) return '';

  let normalized = rawCode
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Remove prefixos descritivos comuns quando seguidos por identificador alfanumérico
  normalized = normalized.replace(
    /^(apartamento|apto|apt|unidade|unid|un|sala|sl|casa|cs|lote|lt)\.?\s*(?=[a-z0-9])/i,
    ''
  );

  normalized = normalized.replace(/[^a-z0-9]/g, '');

  // Remove zeros à esquerda quando o código inicia por dígitos (ex.: "0101" -> "101", "0801" -> "801", "08" -> "8")
  normalized = normalized.replace(/^0+(?=\d)/, '');

  // Fallback caso o código fosse apenas uma palavra como "Loja"
  if (!normalized) {
    normalized = rawCode
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  return normalized;
}

/**
 * Resolve a chave determinística de bloco/quadra para a constraint composta.
 * Como NULL != NULL em índices UNIQUE padrão do PostgreSQL, usamos string vazia ""
 * quando a unidade não pertence a nenhum bloco/torre/quadra específico.
 */
export function resolveBlockKey(blockId?: string | null): string {
  return blockId && blockId.trim() ? blockId.trim() : '';
}

export type { ReferenceAreaType } from './commercial-unit-rules';

/**
 * Calcula valores derivados da unidade comercial sem persistir colunas redundantes.
 * Delega integralmente ao módulo central `commercial-unit-rules.ts` para garantir resultados idênticos
 * entre formulário, listagem, ficha detalhada, consulta do corretor e APIs.
 *
 * Regra definitiva do denominador do R$/m² (Ajustes da Etapa 6B.3.1):
 * - APARTAMENTO, COBERTURA, STUDIO, SALA_COMERCIAL → exclusivamente Área privativa;
 * - CASA → exclusivamente Área construída;
 * - LOTE → exclusivamente Área do terreno.
 * Área útil e Área total nunca são utilizadas como denominador. Sem a metragem exigida, R$/m² = null.
 *
 * Também expõe a discriminação de dormitórios/banheiros e o total de vagas calculados.
 */
export function computeCommercialUnitDerivedMetrics(unit: {
  unitType?: string | null;
  listPrice?: number | null;
  promotionalPrice?: number | null;
  usableArea?: number | null;
  privateArea?: number | null;
  builtArea?: number | null;
  landArea?: number | null;
  totalArea?: number | null;
  bedrooms?: number | null;
  suites?: number | null;
  bathrooms?: number | null;
  lavabos?: number | null;
}) {
  const sqm = computePricePerSqm(unit);
  const rooms = deriveRoomBreakdown(unit);

  return {
    effectivePrice: sqm.effectivePrice,
    referenceArea: sqm.referenceArea,
    referenceAreaType: sqm.referenceAreaType,
    referenceAreaLabel: sqm.referenceAreaLabel,
    requiredReferenceAreaLabel: sqm.requiredAreaLabel,
    pricePerSqm: sqm.pricePerSqm,
    discountPercent: computeDiscountPercent(unit),
    extraBedrooms: rooms.extraBedrooms,
    socialBathrooms: rooms.socialBathrooms,
    totalBedrooms: rooms.totalBedrooms,
    totalBathrooms: rooms.totalBathrooms,
    roomBreakdownInconsistent: rooms.isInconsistent,
  };
}

/**
 * Resolve as colunas persistidas `bedrooms` (Total de Dormitórios) e `bathrooms` (Total de Banheiros)
 * a partir dos campos discriminados enviados pelo formulário, sem migração de banco.
 * - Se `extraBedrooms` for informado: bedrooms = suites + extraBedrooms.
 * - Se `socialBathrooms` for informado: bathrooms = suites + socialBathrooms + lavabos.
 * - Caso contrário, preserva compatibilidade com o contrato anterior (bedrooms/bathrooms totais explícitos).
 */
function resolvePersistedRoomTotals(params: {
  suites: number;
  lavabos: number;
  extraBedrooms?: number | null;
  socialBathrooms?: number | null;
  explicitBedrooms: number;
  explicitBathrooms: number;
}) {
  const hasExtra = params.extraBedrooms !== undefined && params.extraBedrooms !== null;
  const hasSocial = params.socialBathrooms !== undefined && params.socialBathrooms !== null;
  const totals = computeRoomTotals({
    suites: params.suites,
    extraBedrooms: params.extraBedrooms ?? 0,
    socialBathrooms: params.socialBathrooms ?? 0,
    lavabos: params.lavabos,
  });
  return {
    bedrooms: hasExtra ? totals.totalBedrooms : params.explicitBedrooms,
    bathrooms: hasSocial ? totals.totalBathrooms : params.explicitBathrooms,
  };
}

export const COMMERCIAL_UNIT_DESCRIPTION_MAX = 500;

/** Normaliza a descrição geral: remove espaços externos e converte vazio em null. */
function normalizeUnitDescription(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function assertUnitDescription(value: string | null | undefined) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string') {
    throw createDomainError("O campo 'description' deve ser um texto.", 'VALIDATION_ERROR');
  }
  if (value.trim().length > COMMERCIAL_UNIT_DESCRIPTION_MAX) {
    throw createDomainError(
      `A descrição da unidade deve ter no máximo ${COMMERCIAL_UNIT_DESCRIPTION_MAX} caracteres.`,
      'VALIDATION_ERROR'
    );
  }
}

export interface CreateCommercialUnitInput {
  developmentId: string;
  blockId?: string | null;
  typologyId?: string | null;
  unitCode: string;
  unitType?: CommercialUnitType;
  floor?: number | null;
  position?: string | null;
  solarOrientation?: string | null;

  // Campos horizontais / lotes
  lotNumber?: string | null;
  quadraName?: string | null;
  frontage?: number | null;
  backDimension?: number | null;
  leftDepth?: number | null;
  rightDepth?: number | null;
  topography?: TopographyType | string | null;
  isCorner?: boolean;
  houseFloors?: number | null;

  // Áreas e características físicas (usableArea nunca é preenchida automaticamente a partir de privateArea)
  usableArea?: number | null;
  privateArea?: number | null;
  builtArea?: number | null;
  totalArea?: number | null;
  landArea?: number | null;
  bedrooms?: number | null;
  suites?: number | null;
  bathrooms?: number | null;
  lavabos?: number | null;
  /** Dormitórios Extras (sem suíte). Quando informado, `bedrooms` = suites + extraBedrooms. */
  extraBedrooms?: number | null;
  /** Banheiros Sociais. Quando informado, `bathrooms` = suites + socialBathrooms + lavabos. */
  socialBathrooms?: number | null;
  parkingSpaces?: number | null;
  coveredParkingSpaces?: number | null;
  uncoveredParkingSpaces?: number | null;
  parkingBoxNumbers?: string | null;
  storageNumber?: string | null;
  hasBarbecue?: boolean | null;
  isPenthouse?: boolean;

  // Preço e situação comercial
  commercialStatus?: CommercialUnitStatus;
  listPrice?: number | null;
  promotionalPrice?: number | null;
  acceptsFinancing?: boolean;
  acceptsExchange?: boolean;
  exchangeNotes?: string | null;
  reservedUntil?: Date | string | null;
  reservedByNote?: string | null;
  soldAt?: Date | string | null;
  publicNotes?: string | null;
  internalNotes?: string | null;
  /** Descrição geral da unidade (opcional, até 500 caracteres; não confidencial). */
  description?: string | null;

  // Vínculos opcionais com identidade física compartilhada (Decisão D1)
  buildingUnitId?: string | null;
  physicalPropertyId?: string | null;
  landParcelId?: string | null;

  // Auditoria
  actorId?: string | null;
  source?: CommercialHistorySource;
  importBatchId?: string | null;
  reason?: string | null;
}

export interface UpdateCommercialUnitInput {
  expectedDevelopmentId?: string;
  blockId?: string | null;
  typologyId?: string | null;
  unitCode?: string;
  unitType?: CommercialUnitType;
  floor?: number | null;
  position?: string | null;
  solarOrientation?: string | null;

  lotNumber?: string | null;
  quadraName?: string | null;
  frontage?: number | null;
  backDimension?: number | null;
  leftDepth?: number | null;
  rightDepth?: number | null;
  topography?: TopographyType | string | null;
  isCorner?: boolean;
  houseFloors?: number | null;

  usableArea?: number | null;
  privateArea?: number | null;
  builtArea?: number | null;
  totalArea?: number | null;
  landArea?: number | null;
  bedrooms?: number | null;
  suites?: number | null;
  bathrooms?: number | null;
  lavabos?: number | null;
  /** Dormitórios Extras (sem suíte). Quando informado, `bedrooms` = suites + extraBedrooms. */
  extraBedrooms?: number | null;
  /** Banheiros Sociais. Quando informado, `bathrooms` = suites + socialBathrooms + lavabos. */
  socialBathrooms?: number | null;
  parkingSpaces?: number | null;
  coveredParkingSpaces?: number | null;
  uncoveredParkingSpaces?: number | null;
  parkingBoxNumbers?: string | null;
  storageNumber?: string | null;
  hasBarbecue?: boolean | null;
  isPenthouse?: boolean;

  commercialStatus?: CommercialUnitStatus;
  listPrice?: number | null;
  promotionalPrice?: number | null;
  acceptsFinancing?: boolean;
  acceptsExchange?: boolean;
  exchangeNotes?: string | null;
  reservedUntil?: Date | string | null;
  reservedByNote?: string | null;
  soldAt?: Date | string | null;
  publicNotes?: string | null;
  internalNotes?: string | null;
  /** Descrição geral da unidade (opcional, até 500 caracteres; não confidencial). */
  description?: string | null;

  buildingUnitId?: string | null;
  physicalPropertyId?: string | null;
  landParcelId?: string | null;

  actorId?: string | null;
  source?: CommercialHistorySource;
  importBatchId?: string | null;
  reason?: string | null;
}

function assertNonNegativeNumber(value: number | null | undefined, fieldLabel: string) {
  if (value !== undefined && value !== null) {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      throw createDomainError(
        `O campo '${fieldLabel}' deve ser um número maior ou igual a zero.`,
        'VALIDATION_ERROR'
      );
    }
  }
}

function assertPositiveAreaNumber(value: number | null | undefined, fieldLabel: string) {
  if (value !== undefined && value !== null) {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value <= 0) {
      throw createDomainError(
        `O campo '${fieldLabel}' deve ser um número positivo maior que zero.`,
        'VALIDATION_ERROR'
      );
    }
  }
}

/**
 * Valida se o empreendimento existe e se o bloco/quadra e a tipologia pertencem
 * estritamente ao mesmo empreendimento (isolamento entre construtoras e empreendimentos).
 */
export async function validateDevelopmentAndRelations(
  params: {
    developmentId: string;
    blockId?: string | null;
    typologyId?: string | null;
    unitType?: string | null;
    floor?: number | null;
  },
  db: DbClient = defaultPrisma
) {
  const { developmentId, blockId, typologyId, unitType, floor } = params;

  if (!developmentId || !developmentId.trim()) {
    throw createDomainError('O empreendimento (developmentId) é obrigatório.', 'VALIDATION_ERROR');
  }

  const development = await db.development.findUnique({
    where: { id: developmentId },
    select: {
      id: true,
      name: true,
      companyId: true,
      buildingId: true,
      projectType: true,
      status: true,
    },
  });

  if (!development) {
    throw createDomainError('Empreendimento não encontrado.', 'NOT_FOUND');
  }

  let block = null;
  if (blockId) {
    block = await db.developmentBlock.findUnique({
      where: { id: blockId },
    });
    if (!block) {
      throw createDomainError(
        'Bloco, torre ou quadra informada não foi encontrada.',
        'NOT_FOUND'
      );
    }
    if (block.developmentId !== developmentId) {
      throw createDomainError(
        'Violação de vínculo: o bloco/quadra informado pertence a outro empreendimento.',
        'VALIDATION_ERROR'
      );
    }
  }

  let typology = null;
  if (typologyId) {
    typology = await db.typology.findUnique({
      where: { id: typologyId },
    });
    if (!typology) {
      throw createDomainError('Tipologia informada não foi encontrada.', 'NOT_FOUND');
    }
    if (typology.developmentId !== developmentId) {
      throw createDomainError(
        'Violação de vínculo: a tipologia informada pertence a outro empreendimento.',
        'VALIDATION_ERROR'
      );
    }
  }

  if (unitType) {
    if (!VALID_COMMERCIAL_UNIT_TYPES.includes(unitType as CommercialUnitType)) {
      throw createDomainError(
        `Tipo de unidade inválido ('${unitType}'). Valores permitidos: ${VALID_COMMERCIAL_UNIT_TYPES.join(', ')}.`,
        'VALIDATION_ERROR'
      );
    }

    // Validação coerente entre tipo do empreendimento e tipo da unidade
    const projType = (development.projectType || 'VERTICAL').toUpperCase();
    if (
      projType === 'LOTEAMENTO' &&
      (unitType === 'APARTAMENTO' || unitType === 'COBERTURA' || unitType === 'STUDIO')
    ) {
      throw createDomainError(
        `Empreendimentos do tipo LOTEAMENTO não permitem unidades verticais (${unitType}).`,
        'VALIDATION_ERROR'
      );
    }

    if (unitType === 'LOTE' && floor !== undefined && floor !== null) {
      throw createDomainError(
        'Unidades do tipo LOTE não possuem andar/pavimento (floor deve ser nulo).',
        'VALIDATION_ERROR'
      );
    }
  }

  return { development, block, typology };
}

/**
 * Valida o vínculo opcional com a identidade física compartilhada (BuildingUnit, PhysicalProperty, LandParcel)
 * conforme Decisão D1 aprovada na Etapa 6B.0:
 * - Nunca cria Property (anúncio de corretor).
 * - Nunca altera PhysicalProperty.sharedPrice nem activeListingsCount.
 * - Impede vincular BuildingUnit ou PhysicalProperty de edifício diferente do empreendimento.
 */
export async function validatePhysicalIdentityLink(
  params: {
    developmentBuildingId?: string | null;
    buildingUnitId?: string | null;
    physicalPropertyId?: string | null;
    landParcelId?: string | null;
  },
  db: DbClient = defaultPrisma
) {
  const { developmentBuildingId, buildingUnitId, physicalPropertyId, landParcelId } = params;

  let buildingUnit = null;
  let resolvedPhysicalPropertyId = physicalPropertyId ?? null;

  if (buildingUnitId) {
    buildingUnit = await db.buildingUnit.findUnique({
      where: { id: buildingUnitId },
      select: {
        id: true,
        buildingId: true,
        unitNumber: true,
        normalizedUnit: true,
        tower: true,
        physicalPropertyId: true,
      },
    });

    if (!buildingUnit) {
      throw createDomainError(
        'Unidade física compartilhada (BuildingUnit) não encontrada.',
        'NOT_FOUND'
      );
    }

    if (developmentBuildingId && buildingUnit.buildingId !== developmentBuildingId) {
      throw createDomainError(
        'Violação de integridade física: a unidade física (BuildingUnit) pertence a um edifício diferente do vinculado ao empreendimento.',
        'VALIDATION_ERROR'
      );
    }

    if (
      physicalPropertyId &&
      buildingUnit.physicalPropertyId &&
      buildingUnit.physicalPropertyId !== physicalPropertyId
    ) {
      throw createDomainError(
        'Inconsistência física: o PhysicalProperty informado não corresponde ao PhysicalProperty vinculado à BuildingUnit.',
        'VALIDATION_ERROR'
      );
    }

    if (!resolvedPhysicalPropertyId && buildingUnit.physicalPropertyId) {
      resolvedPhysicalPropertyId = buildingUnit.physicalPropertyId;
    }
  }

  let physicalProperty = null;
  if (resolvedPhysicalPropertyId) {
    physicalProperty = await db.physicalProperty.findUnique({
      where: { id: resolvedPhysicalPropertyId },
      select: {
        id: true,
        buildingId: true,
        propertyType: true,
        sharedPrice: true,
        activeListingsCount: true,
        primaryListingId: true,
      },
    });

    if (!physicalProperty) {
      throw createDomainError(
        'Imóvel físico compartilhado (PhysicalProperty) não encontrado.',
        'NOT_FOUND'
      );
    }

    if (
      developmentBuildingId &&
      physicalProperty.buildingId &&
      physicalProperty.buildingId !== developmentBuildingId
    ) {
      throw createDomainError(
        'Violação de integridade física: o imóvel físico compartilhado (PhysicalProperty) pertence a outro edifício.',
        'VALIDATION_ERROR'
      );
    }
  }

  let landParcel = null;
  if (landParcelId) {
    landParcel = await db.landParcel.findUnique({
      where: { id: landParcelId },
      select: { id: true, code: true, boundaryArea: true },
    });

    if (!landParcel) {
      throw createDomainError(
        'Lote cadastral (LandParcel) informado não foi encontrado.',
        'NOT_FOUND'
      );
    }
  }

  return {
    buildingUnit,
    physicalProperty,
    resolvedPhysicalPropertyId,
    landParcel,
  };
}

/**
 * Recalcula de forma transacional o menor preço disponível (`price`) nas tipologias
 * que possuem unidades disponíveis.
 */
export async function syncDevelopmentCommercialMetrics(
  developmentId: string,
  db: DbClient = defaultPrisma
) {
  const availableUnits = await db.commercialUnit.findMany({
    where: {
      developmentId,
      commercialStatus: 'DISPONIVEL',
    },
    select: {
      id: true,
      typologyId: true,
      listPrice: true,
      promotionalPrice: true,
    },
  });

  const minByTypology = new Map<string, number>();
  let globalMinUnitPrice: number | null = null;

  for (const u of availableUnits) {
    const eff =
      u.promotionalPrice != null && u.promotionalPrice > 0
        ? u.promotionalPrice
        : u.listPrice != null && u.listPrice > 0
          ? u.listPrice
          : null;

    if (eff != null) {
      if (globalMinUnitPrice === null || eff < globalMinUnitPrice) {
        globalMinUnitPrice = eff;
      }
      if (u.typologyId) {
        const currentMin = minByTypology.get(u.typologyId);
        if (currentMin === undefined || eff < currentMin) {
          minByTypology.set(u.typologyId, eff);
        }
      }
    }
  }

  for (const [typologyId, minPrice] of minByTypology.entries()) {
    await db.typology.update({
      where: { id: typologyId },
      data: { price: minPrice },
    });
  }

  return {
    availableUnitsCount: availableUnits.length,
    globalMinUnitPrice,
  };
}

/**
 * Cria uma nova unidade comercial oficial da construtora (CommercialUnit) e registra
 * seu evento inicial em CommercialUnitHistory dentro de uma única transação atômica.
 */
export async function createCommercialUnit(
  input: CreateCommercialUnitInput,
  prismaClient: PrismaClient = defaultPrisma
) {
  const rawCode = input.unitCode?.trim();
  if (!rawCode) {
    throw createDomainError(
      'O código ou número comercial da unidade (unitCode) é obrigatório.',
      'VALIDATION_ERROR'
    );
  }

  const normalizedUnitCode = normalizeCommercialUnitCode(rawCode);
  if (!normalizedUnitCode) {
    throw createDomainError(
      'O código da unidade comercial resultante da normalização é inválido.',
      'VALIDATION_ERROR'
    );
  }

  const commercialStatus: CommercialUnitStatus = input.commercialStatus || 'DISPONIVEL';
  if (!VALID_COMMERCIAL_UNIT_STATUSES.includes(commercialStatus)) {
    throw createDomainError(
      `Status comercial inválido: '${commercialStatus}'.`,
      'VALIDATION_ERROR'
    );
  }

  assertNonNegativeNumber(input.listPrice, 'listPrice');
  assertNonNegativeNumber(input.promotionalPrice, 'promotionalPrice');
  assertPositiveAreaNumber(input.usableArea, 'usableArea');
  assertUnitDescription(input.description);
  assertNonNegativeNumber(input.extraBedrooms, 'extraBedrooms');
  assertNonNegativeNumber(input.socialBathrooms, 'socialBathrooms');
  assertNonNegativeNumber(input.privateArea, 'privateArea');
  assertNonNegativeNumber(input.builtArea, 'builtArea');
  assertNonNegativeNumber(input.totalArea, 'totalArea');
  assertNonNegativeNumber(input.landArea, 'landArea');
  assertNonNegativeNumber(input.frontage, 'frontage');
  assertNonNegativeNumber(input.backDimension, 'backDimension');
  assertNonNegativeNumber(input.leftDepth, 'leftDepth');
  assertNonNegativeNumber(input.rightDepth, 'rightDepth');

  if (
    input.listPrice != null &&
    input.promotionalPrice != null &&
    input.promotionalPrice > input.listPrice
  ) {
    throw createDomainError(
      'O preço promocional não pode ser superior ao preço de tabela (listPrice).',
      'VALIDATION_ERROR'
    );
  }

  return prismaClient.$transaction(async (tx) => {
    const { development, block, typology } = await validateDevelopmentAndRelations(
      {
        developmentId: input.developmentId,
        blockId: input.blockId,
        typologyId: input.typologyId,
        unitType: input.unitType || 'APARTAMENTO',
        floor: input.floor,
      },
      tx
    );

    const { resolvedPhysicalPropertyId } = await validatePhysicalIdentityLink(
      {
        developmentBuildingId: development.buildingId,
        buildingUnitId: input.buildingUnitId,
        physicalPropertyId: input.physicalPropertyId,
        landParcelId: input.landParcelId,
      },
      tx
    );

    const blockKey = resolveBlockKey(input.blockId);

    // Verifica unicidade amigável antes do banco
    const existingDuplicate = await tx.commercialUnit.findUnique({
      where: {
        dev_block_unit_unique: {
          developmentId: input.developmentId,
          blockKey,
          normalizedUnitCode,
        },
      },
      select: { id: true, unitCode: true },
    });

    if (existingDuplicate) {
      const blockLabel = block ? ` no bloco/quadra '${block.name}'` : '';
      throw createDomainError(
        `Já existe uma unidade comercial equivalente ('${existingDuplicate.unitCode}') cadastrada neste empreendimento${blockLabel}.`,
        'CONFLICT'
      );
    }

    // Herança inteligente de atributos da tipologia quando não informados explicitamente
    const listPrice =
      input.listPrice !== undefined
        ? input.listPrice
        : typology?.price != null && typology.price > 0
          ? typology.price
          : null;

    const privateArea =
      input.privateArea !== undefined ? input.privateArea : (typology?.privateArea ?? null);
    const builtArea =
      input.builtArea !== undefined ? input.builtArea : (typology?.builtArea ?? null);
    const totalArea =
      input.totalArea !== undefined ? input.totalArea : (typology?.totalArea ?? null);
    const bedrooms =
      input.bedrooms !== undefined && input.bedrooms !== null
        ? input.bedrooms
        : (typology?.bedrooms ?? 0);
    const suites =
      input.suites !== undefined && input.suites !== null
        ? input.suites
        : (typology?.suites ?? 0);
    const bathrooms =
      input.bathrooms !== undefined && input.bathrooms !== null
        ? input.bathrooms
        : (typology?.bathrooms ?? 0);
    const lavabos =
      input.lavabos !== undefined && input.lavabos !== null
        ? input.lavabos
        : (typology?.lavabos ?? 0);
    const coveredParkingSpaces =
      input.coveredParkingSpaces !== undefined
        ? input.coveredParkingSpaces
        : (typology?.coveredParkingSpaces ?? null);
    const uncoveredParkingSpaces =
      input.uncoveredParkingSpaces !== undefined
        ? input.uncoveredParkingSpaces
        : (typology?.uncoveredParkingSpaces ?? null);
    // Vagas totais = cobertas + descobertas quando discriminadas (mesma regra dos imóveis usados)
    const parkingSpaces = computeParkingTotal({
      coveredParkingSpaces,
      uncoveredParkingSpaces,
      parkingSpaces:
        input.parkingSpaces !== undefined && input.parkingSpaces !== null
          ? input.parkingSpaces
          : (typology?.parkingSpaces ?? 0),
    });
    const acceptsExchange =
      input.acceptsExchange !== undefined
        ? input.acceptsExchange
        : Boolean(typology?.acceptsExchange);
    const exchangeNotes =
      input.exchangeNotes !== undefined
        ? input.exchangeNotes
        : (typology?.exchangeNotes ?? null);
    const hasBarbecue =
      input.hasBarbecue !== undefined ? input.hasBarbecue : (typology?.hasBarbecue ?? null);
    const isPenthouse =
      input.isPenthouse !== undefined
        ? input.isPenthouse
        : Boolean(typology?.isPenthouse || input.unitType === 'COBERTURA');

    const unitType: CommercialUnitType = input.unitType || 'APARTAMENTO';

    // Totais de dormitórios e banheiros calculados no servidor a partir da discriminação
    // (Total de Dormitórios = Suítes + Dormitórios Extras; Total de Banheiros = Suítes + Sociais + Lavabos)
    const hasBedroomsForType = unitTypeHasBedrooms(unitType);
    const hasBathroomsForType = unitTypeHasBathrooms(unitType);
    const persistedSuites = hasBedroomsForType ? suites : 0;
    const persistedLavabos = hasBathroomsForType ? lavabos : 0;
    const persistedRooms = resolvePersistedRoomTotals({
      suites: persistedSuites,
      lavabos: persistedLavabos,
      extraBedrooms: hasBedroomsForType ? input.extraBedrooms : 0,
      socialBathrooms: hasBathroomsForType ? input.socialBathrooms : 0,
      explicitBedrooms: hasBedroomsForType ? bedrooms : 0,
      explicitBathrooms: hasBathroomsForType ? bathrooms : 0,
    });

    const quadraName =
      input.quadraName !== undefined
        ? input.quadraName
        : block && block.blockType === 'QUADRA'
          ? block.name
          : null;

    const soldAt =
      commercialStatus === 'VENDIDA'
        ? input.soldAt
          ? new Date(input.soldAt)
          : new Date()
        : null;

    const reservedUntil =
      commercialStatus === 'RESERVADA' && input.reservedUntil
        ? new Date(input.reservedUntil)
        : null;

    const createdUnit = await tx.commercialUnit.create({
      data: {
        developmentId: input.developmentId,
        blockId: input.blockId || null,
        typologyId: input.typologyId || null,
        blockKey,
        unitCode: rawCode,
        normalizedUnitCode,
        unitType,
        floor: unitType === 'LOTE' ? null : (input.floor ?? null),
        position: input.position ?? null,
        solarOrientation: input.solarOrientation ?? null,
        lotNumber: input.lotNumber ?? null,
        quadraName,
        frontage: input.frontage ?? null,
        backDimension: input.backDimension ?? null,
        leftDepth: input.leftDepth ?? null,
        rightDepth: input.rightDepth ?? null,
        topography: input.topography ?? null,
        isCorner: Boolean(input.isCorner),
        houseFloors: input.houseFloors ?? null,
        usableArea: unitType === 'LOTE' ? null : (input.usableArea ?? null),
        privateArea,
        builtArea,
        totalArea,
        landArea: input.landArea ?? null,
        bedrooms: persistedRooms.bedrooms,
        suites: persistedSuites,
        bathrooms: persistedRooms.bathrooms,
        lavabos: persistedLavabos,
        parkingSpaces,
        coveredParkingSpaces,
        uncoveredParkingSpaces,
        parkingBoxNumbers: input.parkingBoxNumbers ?? null,
        storageNumber: input.storageNumber ?? null,
        hasBarbecue,
        isPenthouse,
        commercialStatus,
        listPrice,
        promotionalPrice: input.promotionalPrice ?? null,
        acceptsFinancing: input.acceptsFinancing ?? true,
        acceptsExchange,
        exchangeNotes,
        reservedUntil,
        reservedByNote: input.reservedByNote ?? null,
        soldAt,
        publicNotes: input.publicNotes ?? null,
        internalNotes: input.internalNotes ?? null,
        description: normalizeUnitDescription(input.description),
        buildingUnitId: input.buildingUnitId || null,
        physicalPropertyId: resolvedPhysicalPropertyId,
        landParcelId: input.landParcelId || null,
        createdById: input.actorId || null,
        updatedById: input.actorId || null,
      },
    });

    // Registra histórico inicial auditável
    await tx.commercialUnitHistory.create({
      data: {
        commercialUnitId: createdUnit.id,
        developmentId: createdUnit.developmentId,
        previousStatus: null,
        newStatus: createdUnit.commercialStatus,
        previousListPrice: null,
        newListPrice: createdUnit.listPrice,
        previousPromotionalPrice: null,
        newPromotionalPrice: createdUnit.promotionalPrice,
        changedById: input.actorId || null,
        source: input.source || 'INITIAL_CREATION',
        importBatchId: input.importBatchId || null,
        reason: input.reason || 'Cadastro inicial da unidade comercial',
      },
    });

    await syncDevelopmentCommercialMetrics(input.developmentId, tx);

    return {
      ...createdUnit,
      ...computeCommercialUnitDerivedMetrics(createdUnit),
    };
  });
}

/**
 * Atualiza uma unidade comercial existente.
 * Grava registro em CommercialUnitHistory SOMENTE quando houver mudança efetiva
 * em `commercialStatus`, `listPrice` ou `promotionalPrice` (evitando históricos duplicados/vazios).
 */
export async function updateCommercialUnit(
  unitId: string,
  input: UpdateCommercialUnitInput,
  prismaClient: PrismaClient = defaultPrisma
) {
  assertNonNegativeNumber(input.listPrice, 'listPrice');
  assertNonNegativeNumber(input.promotionalPrice, 'promotionalPrice');
  assertUnitDescription(input.description);
  assertPositiveAreaNumber(input.usableArea, 'usableArea');
  assertNonNegativeNumber(input.extraBedrooms, 'extraBedrooms');
  assertNonNegativeNumber(input.socialBathrooms, 'socialBathrooms');
  assertNonNegativeNumber(input.privateArea, 'privateArea');
  assertNonNegativeNumber(input.builtArea, 'builtArea');
  assertNonNegativeNumber(input.totalArea, 'totalArea');
  assertNonNegativeNumber(input.landArea, 'landArea');
  assertNonNegativeNumber(input.frontage, 'frontage');
  assertNonNegativeNumber(input.backDimension, 'backDimension');
  assertNonNegativeNumber(input.leftDepth, 'leftDepth');
  assertNonNegativeNumber(input.rightDepth, 'rightDepth');

  return prismaClient.$transaction(async (tx) => {
    const existing = await tx.commercialUnit.findUnique({
      where: { id: unitId },
    });

    if (!existing) {
      throw createDomainError('Unidade comercial não encontrada.', 'NOT_FOUND');
    }

    if (
      input.expectedDevelopmentId &&
      existing.developmentId !== input.expectedDevelopmentId
    ) {
      throw createDomainError(
        'Violação de isolamento: a unidade comercial não pertence ao empreendimento informado.',
        'NOT_FOUND'
      );
    }

    const nextBlockId = input.blockId !== undefined ? input.blockId : existing.blockId;
    const nextTypologyId = input.typologyId !== undefined ? input.typologyId : existing.typologyId;
    const nextUnitType = (input.unitType || existing.unitType) as CommercialUnitType;
    const nextFloor =
      nextUnitType === 'LOTE'
        ? null
        : input.floor !== undefined
          ? input.floor
          : existing.floor;

    const { development, block } = await validateDevelopmentAndRelations(
      {
        developmentId: existing.developmentId,
        blockId: nextBlockId,
        typologyId: nextTypologyId,
        unitType: nextUnitType,
        floor: nextFloor,
      },
      tx
    );

    const nextBuildingUnitId =
      input.buildingUnitId !== undefined ? input.buildingUnitId : existing.buildingUnitId;
    const nextPhysicalPropertyId =
      input.physicalPropertyId !== undefined
        ? input.physicalPropertyId
        : existing.physicalPropertyId;
    const nextLandParcelId =
      input.landParcelId !== undefined ? input.landParcelId : existing.landParcelId;

    const { resolvedPhysicalPropertyId } = await validatePhysicalIdentityLink(
      {
        developmentBuildingId: development.buildingId,
        buildingUnitId: nextBuildingUnitId,
        physicalPropertyId: nextPhysicalPropertyId,
        landParcelId: nextLandParcelId,
      },
      tx
    );

    const nextUnitCode =
      input.unitCode !== undefined ? input.unitCode.trim() : existing.unitCode;
    if (!nextUnitCode) {
      throw createDomainError(
        'O código da unidade comercial (unitCode) não pode ser vazio.',
        'VALIDATION_ERROR'
      );
    }

    const nextNormalizedUnitCode = normalizeCommercialUnitCode(nextUnitCode);
    if (!nextNormalizedUnitCode) {
      throw createDomainError(
        'O código normalizado da unidade comercial é inválido.',
        'VALIDATION_ERROR'
      );
    }

    const nextBlockKey = resolveBlockKey(nextBlockId);

    if (
      nextBlockKey !== existing.blockKey ||
      nextNormalizedUnitCode !== existing.normalizedUnitCode
    ) {
      const conflict = await tx.commercialUnit.findUnique({
        where: {
          dev_block_unit_unique: {
            developmentId: existing.developmentId,
            blockKey: nextBlockKey,
            normalizedUnitCode: nextNormalizedUnitCode,
          },
        },
        select: { id: true, unitCode: true },
      });

      if (conflict && conflict.id !== existing.id) {
        const blockLabel = block ? ` no bloco/quadra '${block.name}'` : '';
        throw createDomainError(
          `Já existe outra unidade comercial ('${conflict.unitCode}') com este código neste empreendimento${blockLabel}.`,
          'CONFLICT'
        );
      }
    }

    const nextStatus = (input.commercialStatus || existing.commercialStatus) as CommercialUnitStatus;
    if (!VALID_COMMERCIAL_UNIT_STATUSES.includes(nextStatus)) {
      throw createDomainError(
        `Status comercial inválido: '${nextStatus}'.`,
        'VALIDATION_ERROR'
      );
    }

    // Regra de distrato: retornar de VENDIDA para DISPONIVEL exige motivo auditável
    if (
      existing.commercialStatus === 'VENDIDA' &&
      nextStatus === 'DISPONIVEL' &&
      (!input.reason || !input.reason.trim())
    ) {
      throw createDomainError(
        'Reabrir uma unidade VENDIDA para DISPONIVEL (distrato) exige informar a justificativa (reason).',
        'VALIDATION_ERROR'
      );
    }

    const nextListPrice =
      input.listPrice !== undefined ? input.listPrice : existing.listPrice;
    const nextPromotionalPrice =
      input.promotionalPrice !== undefined ? input.promotionalPrice : existing.promotionalPrice;

    if (
      nextListPrice != null &&
      nextPromotionalPrice != null &&
      nextPromotionalPrice > nextListPrice
    ) {
      throw createDomainError(
        'O preço promocional não pode ser superior ao preço de tabela (listPrice).',
        'VALIDATION_ERROR'
      );
    }

    let nextSoldAt = existing.soldAt;
    if (nextStatus === 'VENDIDA' && existing.commercialStatus !== 'VENDIDA') {
      nextSoldAt = input.soldAt ? new Date(input.soldAt) : new Date();
    } else if (nextStatus !== 'VENDIDA') {
      nextSoldAt = null;
    } else if (input.soldAt !== undefined) {
      nextSoldAt = input.soldAt ? new Date(input.soldAt) : null;
    }

    let nextReservedUntil = existing.reservedUntil;
    let nextReservedByNote = existing.reservedByNote;
    if (nextStatus === 'RESERVADA') {
      if (input.reservedUntil !== undefined) {
        nextReservedUntil = input.reservedUntil ? new Date(input.reservedUntil) : null;
      }
      if (input.reservedByNote !== undefined) {
        nextReservedByNote = input.reservedByNote;
      }
    } else {
      nextReservedUntil = null;
      nextReservedByNote =
        input.reservedByNote !== undefined ? input.reservedByNote : null;
    }

    const statusChanged = nextStatus !== existing.commercialStatus;
    const listPriceChanged = (nextListPrice ?? null) !== (existing.listPrice ?? null);
    const promoPriceChanged =
      (nextPromotionalPrice ?? null) !== (existing.promotionalPrice ?? null);

    // Dormitórios e banheiros: totais recalculados no servidor quando a discriminação é enviada
    const nextHasBedrooms = unitTypeHasBedrooms(nextUnitType);
    const nextHasBathrooms = unitTypeHasBathrooms(nextUnitType);
    const nextSuites = nextHasBedrooms
      ? input.suites !== undefined && input.suites !== null
        ? input.suites
        : existing.suites
      : 0;
    const nextLavabos = nextHasBathrooms
      ? input.lavabos !== undefined && input.lavabos !== null
        ? input.lavabos
        : existing.lavabos
      : 0;
    const resolvedRooms = resolvePersistedRoomTotals({
      suites: nextSuites,
      lavabos: nextLavabos,
      extraBedrooms: input.extraBedrooms,
      socialBathrooms: input.socialBathrooms,
      explicitBedrooms:
        input.bedrooms !== undefined && input.bedrooms !== null
          ? input.bedrooms
          : existing.bedrooms,
      explicitBathrooms:
        input.bathrooms !== undefined && input.bathrooms !== null
          ? input.bathrooms
          : existing.bathrooms,
    });
    const nextRooms = {
      bedrooms: nextHasBedrooms ? resolvedRooms.bedrooms : 0,
      bathrooms: nextHasBathrooms ? resolvedRooms.bathrooms : 0,
    };

    // Vagas: total = cobertas + descobertas quando discriminadas
    const nextCoveredParking =
      input.coveredParkingSpaces !== undefined
        ? input.coveredParkingSpaces
        : existing.coveredParkingSpaces;
    const nextUncoveredParking =
      input.uncoveredParkingSpaces !== undefined
        ? input.uncoveredParkingSpaces
        : existing.uncoveredParkingSpaces;
    const nextParkingSpaces = computeParkingTotal({
      coveredParkingSpaces: nextCoveredParking,
      uncoveredParkingSpaces: nextUncoveredParking,
      parkingSpaces:
        input.parkingSpaces !== undefined && input.parkingSpaces !== null
          ? input.parkingSpaces
          : existing.parkingSpaces,
    });

    const updatedUnit = await tx.commercialUnit.update({
      where: { id: existing.id },
      data: {
        blockId: nextBlockId || null,
        typologyId: nextTypologyId || null,
        blockKey: nextBlockKey,
        unitCode: nextUnitCode,
        normalizedUnitCode: nextNormalizedUnitCode,
        unitType: nextUnitType,
        floor: nextFloor,
        position: input.position !== undefined ? input.position : existing.position,
        solarOrientation:
          input.solarOrientation !== undefined
            ? input.solarOrientation
            : existing.solarOrientation,
        lotNumber: input.lotNumber !== undefined ? input.lotNumber : existing.lotNumber,
        quadraName: input.quadraName !== undefined ? input.quadraName : existing.quadraName,
        frontage: input.frontage !== undefined ? input.frontage : existing.frontage,
        backDimension:
          input.backDimension !== undefined ? input.backDimension : existing.backDimension,
        leftDepth: input.leftDepth !== undefined ? input.leftDepth : existing.leftDepth,
        rightDepth: input.rightDepth !== undefined ? input.rightDepth : existing.rightDepth,
        topography: input.topography !== undefined ? input.topography : existing.topography,
        isCorner: input.isCorner !== undefined ? input.isCorner : existing.isCorner,
        houseFloors: input.houseFloors !== undefined ? input.houseFloors : existing.houseFloors,
        usableArea:
          nextUnitType === 'LOTE'
            ? null
            : input.usableArea !== undefined
              ? input.usableArea
              : existing.usableArea,
        privateArea: input.privateArea !== undefined ? input.privateArea : existing.privateArea,
        builtArea: input.builtArea !== undefined ? input.builtArea : existing.builtArea,
        totalArea: input.totalArea !== undefined ? input.totalArea : existing.totalArea,
        landArea: input.landArea !== undefined ? input.landArea : existing.landArea,
        bedrooms: nextRooms.bedrooms,
        suites: nextSuites,
        bathrooms: nextRooms.bathrooms,
        lavabos: nextLavabos,
        parkingSpaces: nextParkingSpaces,
        coveredParkingSpaces: nextCoveredParking,
        uncoveredParkingSpaces: nextUncoveredParking,
        parkingBoxNumbers:
          input.parkingBoxNumbers !== undefined
            ? input.parkingBoxNumbers
            : existing.parkingBoxNumbers,
        storageNumber:
          input.storageNumber !== undefined ? input.storageNumber : existing.storageNumber,
        hasBarbecue: input.hasBarbecue !== undefined ? input.hasBarbecue : existing.hasBarbecue,
        isPenthouse: input.isPenthouse !== undefined ? input.isPenthouse : existing.isPenthouse,
        commercialStatus: nextStatus,
        listPrice: nextListPrice,
        promotionalPrice: nextPromotionalPrice,
        acceptsFinancing:
          input.acceptsFinancing !== undefined
            ? input.acceptsFinancing
            : existing.acceptsFinancing,
        acceptsExchange:
          input.acceptsExchange !== undefined ? input.acceptsExchange : existing.acceptsExchange,
        exchangeNotes:
          input.exchangeNotes !== undefined ? input.exchangeNotes : existing.exchangeNotes,
        reservedUntil: nextReservedUntil,
        reservedByNote: nextReservedByNote,
        soldAt: nextSoldAt,
        publicNotes: input.publicNotes !== undefined ? input.publicNotes : existing.publicNotes,
        internalNotes:
          input.internalNotes !== undefined ? input.internalNotes : existing.internalNotes,
        description:
          input.description !== undefined ? normalizeUnitDescription(input.description) : existing.description,
        buildingUnitId: nextBuildingUnitId || null,
        physicalPropertyId: resolvedPhysicalPropertyId,
        landParcelId: nextLandParcelId || null,
        updatedById: input.actorId || existing.updatedById,
      },
    });

    let historyEntry = null;
    if (statusChanged || listPriceChanged || promoPriceChanged) {
      historyEntry = await tx.commercialUnitHistory.create({
        data: {
          commercialUnitId: updatedUnit.id,
          developmentId: updatedUnit.developmentId,
          previousStatus: existing.commercialStatus,
          newStatus: updatedUnit.commercialStatus,
          previousListPrice: existing.listPrice,
          newListPrice: updatedUnit.listPrice,
          previousPromotionalPrice: existing.promotionalPrice,
          newPromotionalPrice: updatedUnit.promotionalPrice,
          changedById: input.actorId || null,
          source: input.source || 'MANUAL_ADMIN',
          importBatchId: input.importBatchId || null,
          reason: input.reason || null,
        },
      });

      await syncDevelopmentCommercialMetrics(updatedUnit.developmentId, tx);
    }

    return {
      ...updatedUnit,
      ...computeCommercialUnitDerivedMetrics(updatedUnit),
      historyCreated: Boolean(historyEntry),
      latestHistoryEntry: historyEntry,
    };
  });
}

/**
 * Remove uma unidade comercial (exclusivo ADMIN) validando o empreendimento pai
 * e protegendo contra exclusão irreversível quando houver histórico comercial relevante,
 * condições vinculadas, materiais, itens de importação ou vínculo com identidade física (Seção 15).
 */
export async function deleteCommercialUnit(
  params: {
    unitId: string;
    expectedDevelopmentId?: string;
    actorId?: string | null;
  },
  prismaClient: PrismaClient = defaultPrisma
) {
  return prismaClient.$transaction(async (tx) => {
    const existing = await tx.commercialUnit.findUnique({
      where: { id: params.unitId },
      include: {
        _count: {
          select: {
            history: true,
            paymentConditions: true,
            materials: true,
            importItems: true,
          },
        },
      },
    });

    if (!existing) {
      throw createDomainError('Unidade comercial não encontrada.', 'NOT_FOUND');
    }

    if (
      params.expectedDevelopmentId &&
      existing.developmentId !== params.expectedDevelopmentId
    ) {
      throw createDomainError(
        'Violação de isolamento: a unidade comercial não pertence ao empreendimento informado.',
        'NOT_FOUND'
      );
    }

    const blockingReasons: string[] = [];
    if (existing.commercialStatus !== 'DISPONIVEL') {
      blockingReasons.push(`status comercial atual é '${existing.commercialStatus}'`);
    }
    if (existing._count.history > 1) {
      blockingReasons.push(
        `possui histórico comercial de alterações (${existing._count.history} registros)`
      );
    }
    if (existing._count.paymentConditions > 0) {
      blockingReasons.push(
        `possui ${existing._count.paymentConditions} condição(ões) de pagamento vinculada(s)`
      );
    }
    if (existing._count.materials > 0) {
      blockingReasons.push(
        `possui ${existing._count.materials} material(is) comercial(is) vinculado(s)`
      );
    }
    if (existing._count.importItems > 0) {
      blockingReasons.push(
        `possui ${existing._count.importItems} registro(s) de importação de tabela vinculado(s)`
      );
    }
    if (
      existing.buildingUnitId ||
      existing.physicalPropertyId ||
      existing.landParcelId
    ) {
      blockingReasons.push('possui vínculo ativo com identidade física compartilhada');
    }

    if (blockingReasons.length > 0) {
      throw createDomainError(
        `Exclusão bloqueada para preservar a rastreabilidade: a unidade '${existing.unitCode}' ${blockingReasons.join(', ')}. Utilize a alteração de disponibilidade para 'INDISPONIVEL_TEMPORARIAMENTE' em vez de excluir.`,
        'CONFLICT'
      );
    }

    await tx.commercialUnit.delete({
      where: { id: existing.id },
    });

    await syncDevelopmentCommercialMetrics(existing.developmentId, tx);

    return {
      success: true,
      deletedUnitId: existing.id,
      unitCode: existing.unitCode,
    };
  });
}

/**
 * Serviço dedicado para alterar a disponibilidade (status comercial) de uma unidade
 * com garantia transacional e registro no histórico.
 */
export async function updateCommercialUnitStatus(
  params: {
    unitId: string;
    expectedDevelopmentId?: string;
    newStatus: CommercialUnitStatus;
    actorId?: string | null;
    reason?: string | null;
    reservedUntil?: Date | string | null;
    reservedByNote?: string | null;
    soldAt?: Date | string | null;
    source?: CommercialHistorySource;
    importBatchId?: string | null;
  },
  prismaClient: PrismaClient = defaultPrisma
) {
  return updateCommercialUnit(
    params.unitId,
    {
      expectedDevelopmentId: params.expectedDevelopmentId,
      commercialStatus: params.newStatus,
      reservedUntil: params.reservedUntil,
      reservedByNote: params.reservedByNote,
      soldAt: params.soldAt,
      actorId: params.actorId,
      reason: params.reason,
      source: params.source || 'MANUAL_ADMIN',
      importBatchId: params.importBatchId,
    },
    prismaClient
  );
}

/**
 * Serviço dedicado para atualizar o preço de tabela e/ou preço promocional de uma unidade
 * com garantia transacional, registro no histórico e recálculo do preço mínimo da tipologia.
 */
export async function updateCommercialUnitPrice(
  params: {
    unitId: string;
    expectedDevelopmentId?: string;
    listPrice: number | null;
    promotionalPrice?: number | null;
    actorId?: string | null;
    reason?: string | null;
    source?: CommercialHistorySource;
    importBatchId?: string | null;
  },
  prismaClient: PrismaClient = defaultPrisma
) {
  return updateCommercialUnit(
    params.unitId,
    {
      expectedDevelopmentId: params.expectedDevelopmentId,
      listPrice: params.listPrice,
      promotionalPrice: params.promotionalPrice,
      actorId: params.actorId,
      reason: params.reason,
      source: params.source || 'MANUAL_ADMIN',
      importBatchId: params.importBatchId,
    },
    prismaClient
  );
}

/**
 * Consulta o histórico de alterações de preço e disponibilidade de uma unidade ou empreendimento.
 */
export async function listCommercialUnitHistory(
  params: {
    commercialUnitId?: string;
    developmentId?: string;
    limit?: number;
  },
  db: DbClient = defaultPrisma
) {
  if (!params.commercialUnitId && !params.developmentId) {
    throw createDomainError(
      'Informe commercialUnitId ou developmentId para consultar o histórico.',
      'VALIDATION_ERROR'
    );
  }

  if (params.commercialUnitId && params.developmentId) {
    const unit = await db.commercialUnit.findUnique({
      where: { id: params.commercialUnitId },
      select: { id: true, developmentId: true },
    });
    if (!unit || unit.developmentId !== params.developmentId) {
      throw createDomainError(
        'Unidade comercial não encontrada neste empreendimento.',
        'NOT_FOUND'
      );
    }
  }

  return db.commercialUnitHistory.findMany({
    where: {
      ...(params.commercialUnitId ? { commercialUnitId: params.commercialUnitId } : {}),
      ...(params.developmentId ? { developmentId: params.developmentId } : {}),
    },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      commercialUnit: {
        select: {
          id: true,
          unitCode: true,
          unitType: true,
          blockId: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(params.limit || 100, 1), 500),
  });
}

/**
 * Sanitiza os campos administrativos de uma unidade comercial conforme o perfil do usuário (RBAC).
 * - Para corretores (não-ADMIN): oculta `internalNotes`, `reservedByNote` e os campos de auditoria
 *   (`createdById`, `updatedById`, `createdBy`, `updatedBy`, `history`).
 * - Computa métricas derivadas (`effectivePrice`, `pricePerSqm`, `discountPercent`) e o resumo de revendas
 *   ativas na rede (Bloco 05) sem expor dados sensíveis.
 */
export function sanitizeCommercialUnitForViewer<T extends Record<string, any>>(
  unit: T,
  viewer: DevelopmentViewer
) {
  const admin = isAdminViewer(viewer);
  const derived = computeCommercialUnitDerivedMetrics(unit);

  // Calcula indicadores de revenda secundária (Bloco 05) se houver vínculo físico
  const physicalProp = unit.physicalProperty || unit.buildingUnit?.physicalProperty || null;
  const activeResaleListings = Array.isArray(physicalProp?.listings)
    ? physicalProp.listings.filter((l: any) => l.status === 'Disponível')
    : [];

  const resaleSummary = physicalProp
    ? {
        hasPhysicalIdentity: true,
        physicalPropertyId: physicalProp.id,
        activeResaleListingsCount:
          typeof physicalProp.activeListingsCount === 'number'
            ? physicalProp.activeListingsCount
            : activeResaleListings.length,
        sharedResalePrice:
          physicalProp.sharedPrice != null ? Number(physicalProp.sharedPrice) : null,
        activeResaleListingIds: activeResaleListings.map((l: any) => l.id),
      }
    : {
        hasPhysicalIdentity: Boolean(unit.buildingUnitId || unit.physicalPropertyId),
        physicalPropertyId: unit.physicalPropertyId || null,
        activeResaleListingsCount: 0,
        sharedResalePrice: null,
        activeResaleListingIds: [] as string[],
      };

  if (admin) {
    return {
      ...unit,
      ...derived,
      resaleSummary,
    };
  }

  // Corretor: remove campos internos e de auditoria administrativa (garantia no servidor, não apenas na interface)
  const {
    createdById: _createdById,
    updatedById: _updatedById,
    createdBy: _createdBy,
    updatedBy: _updatedBy,
    history: _history,
    importBatchId: _importBatchId,
    ...brokerSafeUnit
  } = unit as Record<string, any>;

  return {
    ...(brokerSafeUnit as T),
    ...derived,
    internalNotes: null,
    reservedByNote: null,
    resaleSummary,
  };
}

/**
 * Consulta uma unidade comercial por ID respeitando as regras de visibilidade do empreendimento,
 * validando opcionalmente o `expectedDevelopmentId` e sanitizando campos administrativos para corretores.
 */
export async function getCommercialUnitById(
  unitId: string,
  viewer: DevelopmentViewer,
  db: DbClient = defaultPrisma,
  expectedDevelopmentId?: string
) {
  const unit = await db.commercialUnit.findUnique({
    where: { id: unitId },
    include: {
      block: true,
      typology: true,
      buildingUnit: {
        select: {
          id: true,
          buildingId: true,
          unitNumber: true,
          normalizedUnit: true,
          tower: true,
          floor: true,
          physicalPropertyId: true,
        },
      },
      physicalProperty: {
        select: {
          id: true,
          buildingId: true,
          activeListingsCount: true,
          sharedPrice: true,
          listings: {
            where: { status: 'Disponível' },
            select: {
              id: true,
              title: true,
              price: true,
              status: true,
              listingSlot: true,
              isPrimaryListing: true,
            },
          },
        },
      },
      paymentConditions: {
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }],
      },
    },
  });

  if (!unit) return null;

  if (expectedDevelopmentId && unit.developmentId !== expectedDevelopmentId) {
    return null;
  }

  // Confirma se o usuário tem permissão para ver o empreendimento pai
  const visibleDev = await db.development.findFirst({
    where: buildDevelopmentVisibleByIdWhere(viewer, unit.developmentId),
    select: { id: true },
  });

  if (!visibleDev) return null;

  const sanitized = sanitizeCommercialUnitForViewer(unit, viewer);
  const resolvedConditions = await resolveUnitPaymentConditions(unit.id, viewer, db);

  return {
    ...sanitized,
    paymentConditions: resolvedConditions,
  };
}

export type CommercialUnitSortField =
  | 'unitCode'
  | 'floor'
  | 'listPrice'
  | 'usableArea'
  | 'privateArea'
  | 'builtArea'
  | 'totalArea'
  | 'landArea'
  | 'pricePerSqm'
  | 'commercialStatus'
  | 'updatedAt'
  | 'createdAt';

export type CommercialUnitAreaFilterType = 'USABLE' | 'PRIVATE' | 'BUILT' | 'LAND' | 'TOTAL';

export interface ListCommercialUnitsFilters {
  developmentId: string;
  blockId?: string | null;
  typologyId?: string | null;
  commercialStatus?: CommercialUnitStatus | 'ALL' | null;
  unitType?: CommercialUnitType | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  areaType?: CommercialUnitAreaFilterType | string | null;
  minBedrooms?: number | null;
  minParkingSpaces?: number | null;
  floor?: number | null;
  acceptsExchange?: boolean | null;
  search?: string | null;
  page?: number | null;
  limit?: number | null;
  sortBy?: CommercialUnitSortField | string | null;
  sortOrder?: 'asc' | 'desc' | string | null;
}

/**
 * Constrói o filtro Prisma para unidades comerciais de um empreendimento.
 */
function buildCommercialUnitsWhereInput(
  filters: ListCommercialUnitsFilters
): Prisma.CommercialUnitWhereInput {
  const andConditions: Prisma.CommercialUnitWhereInput[] = [
    { developmentId: filters.developmentId },
  ];

  if (filters.blockId) andConditions.push({ blockId: filters.blockId });
  if (filters.typologyId) andConditions.push({ typologyId: filters.typologyId });
  if (filters.commercialStatus && filters.commercialStatus !== 'ALL') {
    andConditions.push({ commercialStatus: filters.commercialStatus });
  }
  if (filters.unitType) andConditions.push({ unitType: filters.unitType });
  if (filters.floor !== undefined && filters.floor !== null) {
    andConditions.push({ floor: filters.floor });
  }
  if (filters.minBedrooms !== undefined && filters.minBedrooms !== null) {
    andConditions.push({ bedrooms: { gte: filters.minBedrooms } });
  }
  if (filters.minParkingSpaces !== undefined && filters.minParkingSpaces !== null) {
    andConditions.push({ parkingSpaces: { gte: filters.minParkingSpaces } });
  }
  if (filters.acceptsExchange !== undefined && filters.acceptsExchange !== null) {
    andConditions.push({ acceptsExchange: filters.acceptsExchange });
  }

  // Faixa de preço (considera listPrice ou promotionalPrice quando presente)
  if (filters.minPrice != null || filters.maxPrice != null) {
    const priceRange = {
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
    andConditions.push({
      OR: [
        { promotionalPrice: { not: null, ...priceRange } },
        { promotionalPrice: null, listPrice: priceRange },
      ],
    });
  }

  // Faixa de área (respeita areaType específico sem misturar área de lote com área privativa/construída)
  if (filters.minArea != null || filters.maxArea != null) {
    const areaRange = {
      ...(filters.minArea != null ? { gte: filters.minArea } : {}),
      ...(filters.maxArea != null ? { lte: filters.maxArea } : {}),
    };
    const normalizedAreaType = filters.areaType?.trim().toUpperCase();
    if (normalizedAreaType === 'USABLE') {
      andConditions.push({ usableArea: areaRange });
    } else if (normalizedAreaType === 'PRIVATE') {
      andConditions.push({ privateArea: areaRange });
    } else if (normalizedAreaType === 'BUILT') {
      andConditions.push({ builtArea: areaRange });
    } else if (normalizedAreaType === 'LAND') {
      andConditions.push({ landArea: areaRange });
    } else if (normalizedAreaType === 'TOTAL') {
      andConditions.push({ totalArea: areaRange });
    } else {
      andConditions.push({
        OR: [
          { usableArea: areaRange },
          { privateArea: areaRange },
          { landArea: areaRange },
          { builtArea: areaRange },
          { totalArea: areaRange },
        ],
      });
    }
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    const normQ = normalizeCommercialUnitCode(q);
    andConditions.push({
      OR: [
        { unitCode: { contains: q, mode: 'insensitive' } },
        ...(normQ ? [{ normalizedUnitCode: { contains: normQ, mode: 'insensitive' as const } }] : []),
        { lotNumber: { contains: q, mode: 'insensitive' } },
        { quadraName: { contains: q, mode: 'insensitive' } },
        { position: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  return { AND: andConditions };
}

function buildCommercialUnitsOrderBy(
  sortBy?: string | null,
  sortOrder?: string | null
): Prisma.CommercialUnitOrderByWithRelationInput[] {
  const dir: Prisma.SortOrder =
    sortOrder && sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';

  switch (sortBy) {
    case 'listPrice':
      return [{ listPrice: dir }, { unitCode: 'asc' }];
    case 'usableArea':
      return [{ usableArea: dir }, { unitCode: 'asc' }];
    case 'privateArea':
      return [{ privateArea: dir }, { unitCode: 'asc' }];
    case 'builtArea':
      return [{ builtArea: dir }, { unitCode: 'asc' }];
    case 'totalArea':
      return [{ totalArea: dir }, { unitCode: 'asc' }];
    case 'landArea':
      return [{ landArea: dir }, { unitCode: 'asc' }];
    case 'commercialStatus':
      return [{ commercialStatus: dir }, { floor: 'asc' }, { unitCode: 'asc' }];
    case 'updatedAt':
      return [{ updatedAt: dir }];
    case 'createdAt':
      return [{ createdAt: dir }];
    case 'unitCode':
      return [{ unitCode: dir }];
    case 'floor':
    default:
      return [{ floor: dir }, { unitCode: 'asc' }];
  }
}

/**
 * Lista paginada de unidades comerciais com filtros, ordenação e resumo estatístico do estoque.
 * Verifica a visibilidade do empreendimento pai antes de consultar.
 */
export async function listCommercialUnitsPaginated(
  viewer: DevelopmentViewer,
  filters: ListCommercialUnitsFilters,
  db: DbClient = defaultPrisma
) {
  const visibleDev = await db.development.findFirst({
    where: buildDevelopmentVisibleByIdWhere(viewer, filters.developmentId),
    select: { id: true, name: true, projectType: true, status: true },
  });

  if (!visibleDev) {
    return null;
  }

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 100);
  const skip = (page - 1) * limit;

  const where = buildCommercialUnitsWhereInput(filters);
  const orderBy = buildCommercialUnitsOrderBy(filters.sortBy, filters.sortOrder);
  const sortByPricePerSqm = filters.sortBy === 'pricePerSqm';

  const unitInclude = {
    block: {
      select: { id: true, name: true, blockType: true },
    },
    typology: {
      select: { id: true, name: true, propertyType: true },
    },
    physicalProperty: {
      select: {
        id: true,
        activeListingsCount: true,
        sharedPrice: true,
        listings: {
          where: { status: 'Disponível' },
          select: { id: true, status: true },
        },
      },
    },
  };

  const [total, units, allDevUnits] = await Promise.all([
    db.commercialUnit.count({ where }),
    db.commercialUnit.findMany({
      where,
      include: unitInclude,
      orderBy,
      ...(sortByPricePerSqm ? {} : { skip, take: limit }),
    }),
    db.commercialUnit.findMany({
      where: { developmentId: filters.developmentId },
      select: {
        commercialStatus: true,
        listPrice: true,
        promotionalPrice: true,
      },
    }),
  ]);

  let availableCount = 0;
  let reservedCount = 0;
  let soldCount = 0;
  let unavailableCount = 0;
  let minAvailablePrice: number | null = null;
  let maxAvailablePrice: number | null = null;

  for (const u of allDevUnits) {
    if (u.commercialStatus === 'DISPONIVEL') {
      availableCount++;
      const eff =
        u.promotionalPrice != null && u.promotionalPrice > 0
          ? u.promotionalPrice
          : u.listPrice != null && u.listPrice > 0
            ? u.listPrice
            : null;
      if (eff != null) {
        if (minAvailablePrice === null || eff < minAvailablePrice) minAvailablePrice = eff;
        if (maxAvailablePrice === null || eff > maxAvailablePrice) maxAvailablePrice = eff;
      }
    } else if (u.commercialStatus === 'RESERVADA') {
      reservedCount++;
    } else if (u.commercialStatus === 'VENDIDA') {
      soldCount++;
    } else if (u.commercialStatus === 'INDISPONIVEL_TEMPORARIAMENTE') {
      unavailableCount++;
    }
  }

  let sanitizedItems = units.map((u) => sanitizeCommercialUnitForViewer(u, viewer));

  if (sortByPricePerSqm) {
    const dir =
      filters.sortOrder && filters.sortOrder.toLowerCase() === 'desc' ? -1 : 1;
    sanitizedItems.sort((a, b) => {
      const aVal = a.pricePerSqm;
      const bVal = b.pricePerSqm;
      if (aVal == null && bVal == null) return a.unitCode.localeCompare(b.unitCode);
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal !== bVal) return (aVal - bVal) * dir;
      return a.unitCode.localeCompare(b.unitCode);
    });
    sanitizedItems = sanitizedItems.slice(skip, skip + limit);
  }

  return {
    items: sanitizedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    summary: {
      totalUnits: allDevUnits.length,
      availableCount,
      reservedCount,
      soldCount,
      unavailableCount,
      minAvailablePrice,
      maxAvailablePrice,
    },
  };
}

/**
 * Mantém a assinatura de listagem direta (array) para compatibilidade com chamadas internas e testes da 6B.1.
 */
export async function listCommercialUnits(
  viewer: DevelopmentViewer,
  filters: ListCommercialUnitsFilters,
  db: DbClient = defaultPrisma
) {
  const result = await listCommercialUnitsPaginated(
    viewer,
    { ...filters, page: filters.page || 1, limit: filters.limit || 100 },
    db
  );
  return result ? result.items : [];
}

/**
 * Consulta as torres, blocos e quadras de um empreendimento com resumo de estoque por bloco.
 */
export async function listDevelopmentBlocksWithSummary(
  developmentId: string,
  viewer: DevelopmentViewer,
  db: DbClient = defaultPrisma
) {
  const visibleDev = await db.development.findFirst({
    where: buildDevelopmentVisibleByIdWhere(viewer, developmentId),
    select: { id: true, name: true, projectType: true },
  });

  if (!visibleDev) {
    return null;
  }

  const [blocks, units] = await Promise.all([
    db.developmentBlock.findMany({
      where: { developmentId },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    }),
    db.commercialUnit.findMany({
      where: { developmentId },
      select: {
        id: true,
        blockId: true,
        commercialStatus: true,
        listPrice: true,
        promotionalPrice: true,
      },
    }),
  ]);

  const statsByBlock = new Map<
    string,
    {
      totalUnits: number;
      availableUnits: number;
      reservedUnits: number;
      soldUnits: number;
      unavailableUnits: number;
    }
  >();

  for (const b of blocks) {
    statsByBlock.set(b.id, {
      totalUnits: 0,
      availableUnits: 0,
      reservedUnits: 0,
      soldUnits: 0,
      unavailableUnits: 0,
    });
  }

  for (const u of units) {
    if (!u.blockId) continue;
    const st = statsByBlock.get(u.blockId);
    if (!st) continue;
    st.totalUnits++;
    if (u.commercialStatus === 'DISPONIVEL') st.availableUnits++;
    else if (u.commercialStatus === 'RESERVADA') st.reservedUnits++;
    else if (u.commercialStatus === 'VENDIDA') st.soldUnits++;
    else if (u.commercialStatus === 'INDISPONIVEL_TEMPORARIAMENTE') st.unavailableUnits++;
  }

  return blocks.map((b) => ({
    ...b,
    unitStats: statsByBlock.get(b.id) || {
      totalUnits: 0,
      availableUnits: 0,
      reservedUnits: 0,
      soldUnits: 0,
      unavailableUnits: 0,
    },
  }));
}

// ==============================================================================
// SERVIÇOS DE CONDIÇÕES COMERCIAIS DE PAGAMENTO (CommercialPaymentCondition)
// ==============================================================================

export interface CreateCommercialPaymentConditionInput {
  developmentId: string;
  blockId?: string | null;
  typologyId?: string | null;
  commercialUnitId?: string | null;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;

  downPaymentPercent?: number | null;
  downPaymentAmount?: number | null;
  downPaymentInstallments?: number;

  monthlyCount?: number | null;
  monthlyPercentTotal?: number | null;
  monthlyInstallmentAmount?: number | null;

  reinforcementCount?: number | null;
  reinforcementFrequencyMonths?: number | null;
  reinforcementPercentTotal?: number | null;
  reinforcementInstallmentAmount?: number | null;

  keysPercent?: number | null;
  keysAmount?: number | null;
  financingPercent?: number | null;
  financingAmount?: number | null;
  directInstallmentsPostKeys?: number | null;

  correctionIndexPreKeys?: string | null;
  correctionIndexPostKeys?: string | null;
  acceptsExchange?: boolean;
  maxExchangePercent?: number | null;
  exchangeNotes?: string | null;

  validUntil?: Date | string | null;
  publicNotes?: string | null;
  internalNotes?: string | null;
  displayOrder?: number;
  actorId?: string | null;
}

export interface UpdateCommercialPaymentConditionInput
  extends Partial<Omit<CreateCommercialPaymentConditionInput, 'developmentId'>> {
  expectedDevelopmentId?: string;
}

function assertPercentRange(value: number | null | undefined, label: string) {
  if (value !== undefined && value !== null) {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 100) {
      throw createDomainError(
        `O percentual '${label}' deve estar entre 0 e 100.`,
        'VALIDATION_ERROR'
      );
    }
  }
}

function resolveConditionScopeLevel(c: {
  commercialUnitId?: string | null;
  typologyId?: string | null;
  blockId?: string | null;
}) {
  if (c.commercialUnitId) return 'UNIT' as const;
  if (c.typologyId) return 'TYPOLOGY' as const;
  if (c.blockId) return 'BLOCK' as const;
  return 'DEVELOPMENT' as const;
}

export function sanitizePaymentConditionForViewer<T extends Record<string, any>>(
  condition: T,
  viewer: DevelopmentViewer
) {
  const admin = isAdminViewer(viewer);
  if (admin) {
    return {
      ...condition,
      scopeLevel: resolveConditionScopeLevel(condition),
      internalNotes: condition.internalNotes,
    };
  }
  // Corretor: sem notas internas nem identificação de autoria administrativa
  const { createdById: _createdById, createdBy: _createdBy, ...brokerSafe } =
    condition as Record<string, any>;
  return {
    ...(brokerSafe as T),
    scopeLevel: resolveConditionScopeLevel(condition),
    internalNotes: null,
  };
}

/**
 * Cria uma condição comercial de pagamento (geral do empreendimento, por bloco/quadra,
 * por tipologia ou exclusiva de uma unidade comercial), validando todos os vínculos.
 */
export async function createCommercialPaymentCondition(
  input: CreateCommercialPaymentConditionInput,
  db: DbClient = defaultPrisma
) {
  const name = input.name?.trim();
  if (!name) {
    throw createDomainError(
      'O nome da condição de pagamento (name) é obrigatório.',
      'VALIDATION_ERROR'
    );
  }

  assertPercentRange(input.downPaymentPercent, 'downPaymentPercent');
  assertPercentRange(input.monthlyPercentTotal, 'monthlyPercentTotal');
  assertPercentRange(input.reinforcementPercentTotal, 'reinforcementPercentTotal');
  assertPercentRange(input.keysPercent, 'keysPercent');
  assertPercentRange(input.financingPercent, 'financingPercent');
  assertPercentRange(input.maxExchangePercent, 'maxExchangePercent');

  assertNonNegativeNumber(input.downPaymentAmount, 'downPaymentAmount');
  assertNonNegativeNumber(input.monthlyInstallmentAmount, 'monthlyInstallmentAmount');
  assertNonNegativeNumber(input.reinforcementInstallmentAmount, 'reinforcementInstallmentAmount');
  assertNonNegativeNumber(input.keysAmount, 'keysAmount');
  assertNonNegativeNumber(input.financingAmount, 'financingAmount');

  await validateDevelopmentAndRelations(
    {
      developmentId: input.developmentId,
      blockId: input.blockId,
      typologyId: input.typologyId,
    },
    db
  );

  if (input.commercialUnitId) {
    const unit = await db.commercialUnit.findUnique({
      where: { id: input.commercialUnitId },
      select: { id: true, developmentId: true },
    });
    if (!unit) {
      throw createDomainError(
        'Unidade comercial informada para a condição de pagamento não existe.',
        'NOT_FOUND'
      );
    }
    if (unit.developmentId !== input.developmentId) {
      throw createDomainError(
        'Violação de vínculo: a unidade comercial pertence a outro empreendimento.',
        'VALIDATION_ERROR'
      );
    }
  }

  const created = await db.commercialPaymentCondition.create({
    data: {
      developmentId: input.developmentId,
      blockId: input.blockId || null,
      typologyId: input.typologyId || null,
      commercialUnitId: input.commercialUnitId || null,
      name,
      description: input.description ?? null,
      isDefault: Boolean(input.isDefault),
      isActive: input.isActive ?? true,
      downPaymentPercent: input.downPaymentPercent ?? null,
      downPaymentAmount: input.downPaymentAmount ?? null,
      downPaymentInstallments: input.downPaymentInstallments ?? 1,
      monthlyCount: input.monthlyCount ?? null,
      monthlyPercentTotal: input.monthlyPercentTotal ?? null,
      monthlyInstallmentAmount: input.monthlyInstallmentAmount ?? null,
      reinforcementCount: input.reinforcementCount ?? null,
      reinforcementFrequencyMonths: input.reinforcementFrequencyMonths ?? null,
      reinforcementPercentTotal: input.reinforcementPercentTotal ?? null,
      reinforcementInstallmentAmount: input.reinforcementInstallmentAmount ?? null,
      keysPercent: input.keysPercent ?? null,
      keysAmount: input.keysAmount ?? null,
      financingPercent: input.financingPercent ?? null,
      financingAmount: input.financingAmount ?? null,
      directInstallmentsPostKeys: input.directInstallmentsPostKeys ?? null,
      correctionIndexPreKeys: input.correctionIndexPreKeys ?? null,
      correctionIndexPostKeys: input.correctionIndexPostKeys ?? null,
      acceptsExchange: Boolean(input.acceptsExchange),
      maxExchangePercent: input.maxExchangePercent ?? null,
      exchangeNotes: input.exchangeNotes ?? null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      publicNotes: input.publicNotes ?? null,
      internalNotes: input.internalNotes ?? null,
      displayOrder: input.displayOrder ?? 0,
      createdById: input.actorId || null,
    },
  });

  return {
    ...created,
    scopeLevel: resolveConditionScopeLevel(created),
  };
}

/**
 * Atualiza uma condição comercial de pagamento existente, validando isolamento por empreendimento.
 */
export async function updateCommercialPaymentCondition(
  conditionId: string,
  input: UpdateCommercialPaymentConditionInput,
  db: DbClient = defaultPrisma
) {
  const existing = await db.commercialPaymentCondition.findUnique({
    where: { id: conditionId },
  });

  if (!existing) {
    throw createDomainError('Condição comercial de pagamento não encontrada.', 'NOT_FOUND');
  }

  if (
    input.expectedDevelopmentId &&
    existing.developmentId !== input.expectedDevelopmentId
  ) {
    throw createDomainError(
      'Violação de isolamento: a condição de pagamento não pertence ao empreendimento informado.',
      'NOT_FOUND'
    );
  }

  if (input.name !== undefined && !input.name.trim()) {
    throw createDomainError(
      'O nome da condição de pagamento não pode ser vazio.',
      'VALIDATION_ERROR'
    );
  }

  assertPercentRange(input.downPaymentPercent, 'downPaymentPercent');
  assertPercentRange(input.monthlyPercentTotal, 'monthlyPercentTotal');
  assertPercentRange(input.reinforcementPercentTotal, 'reinforcementPercentTotal');
  assertPercentRange(input.keysPercent, 'keysPercent');
  assertPercentRange(input.financingPercent, 'financingPercent');
  assertPercentRange(input.maxExchangePercent, 'maxExchangePercent');

  assertNonNegativeNumber(input.downPaymentAmount, 'downPaymentAmount');
  assertNonNegativeNumber(input.monthlyInstallmentAmount, 'monthlyInstallmentAmount');
  assertNonNegativeNumber(input.reinforcementInstallmentAmount, 'reinforcementInstallmentAmount');
  assertNonNegativeNumber(input.keysAmount, 'keysAmount');
  assertNonNegativeNumber(input.financingAmount, 'financingAmount');

  const nextBlockId = input.blockId !== undefined ? input.blockId : existing.blockId;
  const nextTypologyId = input.typologyId !== undefined ? input.typologyId : existing.typologyId;
  const nextUnitId =
    input.commercialUnitId !== undefined ? input.commercialUnitId : existing.commercialUnitId;

  await validateDevelopmentAndRelations(
    {
      developmentId: existing.developmentId,
      blockId: nextBlockId,
      typologyId: nextTypologyId,
    },
    db
  );

  if (nextUnitId) {
    const unit = await db.commercialUnit.findUnique({
      where: { id: nextUnitId },
      select: { id: true, developmentId: true },
    });
    if (!unit) {
      throw createDomainError(
        'Unidade comercial informada para a condição de pagamento não existe.',
        'NOT_FOUND'
      );
    }
    if (unit.developmentId !== existing.developmentId) {
      throw createDomainError(
        'Violação de vínculo: a unidade comercial pertence a outro empreendimento.',
        'VALIDATION_ERROR'
      );
    }
  }

  const updated = await db.commercialPaymentCondition.update({
    where: { id: existing.id },
    data: {
      blockId: nextBlockId || null,
      typologyId: nextTypologyId || null,
      commercialUnitId: nextUnitId || null,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description: input.description !== undefined ? input.description : existing.description,
      isDefault: input.isDefault !== undefined ? Boolean(input.isDefault) : existing.isDefault,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : existing.isActive,
      downPaymentPercent:
        input.downPaymentPercent !== undefined
          ? input.downPaymentPercent
          : existing.downPaymentPercent,
      downPaymentAmount:
        input.downPaymentAmount !== undefined
          ? input.downPaymentAmount
          : existing.downPaymentAmount,
      downPaymentInstallments:
        input.downPaymentInstallments !== undefined
          ? input.downPaymentInstallments
          : existing.downPaymentInstallments,
      monthlyCount:
        input.monthlyCount !== undefined ? input.monthlyCount : existing.monthlyCount,
      monthlyPercentTotal:
        input.monthlyPercentTotal !== undefined
          ? input.monthlyPercentTotal
          : existing.monthlyPercentTotal,
      monthlyInstallmentAmount:
        input.monthlyInstallmentAmount !== undefined
          ? input.monthlyInstallmentAmount
          : existing.monthlyInstallmentAmount,
      reinforcementCount:
        input.reinforcementCount !== undefined
          ? input.reinforcementCount
          : existing.reinforcementCount,
      reinforcementFrequencyMonths:
        input.reinforcementFrequencyMonths !== undefined
          ? input.reinforcementFrequencyMonths
          : existing.reinforcementFrequencyMonths,
      reinforcementPercentTotal:
        input.reinforcementPercentTotal !== undefined
          ? input.reinforcementPercentTotal
          : existing.reinforcementPercentTotal,
      reinforcementInstallmentAmount:
        input.reinforcementInstallmentAmount !== undefined
          ? input.reinforcementInstallmentAmount
          : existing.reinforcementInstallmentAmount,
      keysPercent: input.keysPercent !== undefined ? input.keysPercent : existing.keysPercent,
      keysAmount: input.keysAmount !== undefined ? input.keysAmount : existing.keysAmount,
      financingPercent:
        input.financingPercent !== undefined
          ? input.financingPercent
          : existing.financingPercent,
      financingAmount:
        input.financingAmount !== undefined ? input.financingAmount : existing.financingAmount,
      directInstallmentsPostKeys:
        input.directInstallmentsPostKeys !== undefined
          ? input.directInstallmentsPostKeys
          : existing.directInstallmentsPostKeys,
      correctionIndexPreKeys:
        input.correctionIndexPreKeys !== undefined
          ? input.correctionIndexPreKeys
          : existing.correctionIndexPreKeys,
      correctionIndexPostKeys:
        input.correctionIndexPostKeys !== undefined
          ? input.correctionIndexPostKeys
          : existing.correctionIndexPostKeys,
      acceptsExchange:
        input.acceptsExchange !== undefined
          ? Boolean(input.acceptsExchange)
          : existing.acceptsExchange,
      maxExchangePercent:
        input.maxExchangePercent !== undefined
          ? input.maxExchangePercent
          : existing.maxExchangePercent,
      exchangeNotes:
        input.exchangeNotes !== undefined ? input.exchangeNotes : existing.exchangeNotes,
      validUntil:
        input.validUntil !== undefined
          ? input.validUntil
            ? new Date(input.validUntil)
            : null
          : existing.validUntil,
      publicNotes: input.publicNotes !== undefined ? input.publicNotes : existing.publicNotes,
      internalNotes:
        input.internalNotes !== undefined ? input.internalNotes : existing.internalNotes,
      displayOrder:
        input.displayOrder !== undefined ? input.displayOrder : existing.displayOrder,
    },
  });

  return {
    ...updated,
    scopeLevel: resolveConditionScopeLevel(updated),
  };
}

/**
 * Remove uma condição comercial de pagamento (exclusivo ADMIN).
 */
export async function deleteCommercialPaymentCondition(
  params: {
    conditionId: string;
    expectedDevelopmentId?: string;
  },
  db: DbClient = defaultPrisma
) {
  const existing = await db.commercialPaymentCondition.findUnique({
    where: { id: params.conditionId },
    select: { id: true, name: true, developmentId: true },
  });

  if (!existing) {
    throw createDomainError('Condição comercial de pagamento não encontrada.', 'NOT_FOUND');
  }

  if (
    params.expectedDevelopmentId &&
    existing.developmentId !== params.expectedDevelopmentId
  ) {
    throw createDomainError(
      'Violação de isolamento: a condição de pagamento não pertence ao empreendimento informado.',
      'NOT_FOUND'
    );
  }

  await db.commercialPaymentCondition.delete({
    where: { id: existing.id },
  });

  return {
    success: true,
    deletedConditionId: existing.id,
    name: existing.name,
  };
}

/**
 * Lista condições de pagamento de um empreendimento respeitando visibilidade e sanitização RBAC.
 */
export async function listCommercialPaymentConditions(
  viewer: DevelopmentViewer,
  params: {
    developmentId: string;
    blockId?: string | null;
    typologyId?: string | null;
    commercialUnitId?: string | null;
    includeInactive?: boolean;
  },
  db: DbClient = defaultPrisma
) {
  const visibleDev = await db.development.findFirst({
    where: buildDevelopmentVisibleByIdWhere(viewer, params.developmentId),
    select: { id: true },
  });

  if (!visibleDev) {
    return null;
  }

  const admin = isAdminViewer(viewer);

  const conditions = await db.commercialPaymentCondition.findMany({
    where: {
      developmentId: params.developmentId,
      ...(admin && params.includeInactive ? {} : { isActive: true }),
      ...(params.blockId ? { blockId: params.blockId } : {}),
      ...(params.typologyId ? { typologyId: params.typologyId } : {}),
      ...(params.commercialUnitId ? { commercialUnitId: params.commercialUnitId } : {}),
    },
    include: {
      block: { select: { id: true, name: true, blockType: true } },
      typology: { select: { id: true, name: true } },
      commercialUnit: { select: { id: true, unitCode: true } },
    },
    orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return conditions.map((c) => sanitizePaymentConditionForViewer(c, viewer));
}

/**
 * Resolve as condições de pagamento aplicáveis a uma unidade comercial seguindo a
 * hierarquia: Unidade > Tipologia > Bloco/Quadra > Geral do Empreendimento.
 */
export async function resolveUnitPaymentConditions(
  unitId: string,
  viewer: DevelopmentViewer,
  db: DbClient = defaultPrisma,
  expectedDevelopmentId?: string
) {
  const unit = await db.commercialUnit.findUnique({
    where: { id: unitId },
    select: {
      id: true,
      developmentId: true,
      blockId: true,
      typologyId: true,
      listPrice: true,
      promotionalPrice: true,
    },
  });

  if (!unit) {
    throw createDomainError('Unidade comercial não encontrada.', 'NOT_FOUND');
  }

  if (expectedDevelopmentId && unit.developmentId !== expectedDevelopmentId) {
    throw createDomainError(
      'Violação de isolamento: a unidade comercial não pertence ao empreendimento informado.',
      'NOT_FOUND'
    );
  }

  const visibleDev = await db.development.findFirst({
    where: buildDevelopmentVisibleByIdWhere(viewer, unit.developmentId),
    select: { id: true },
  });

  if (!visibleDev) {
    throw createDomainError('Empreendimento não encontrado ou não disponível.', 'NOT_FOUND');
  }

  const orScopes: Prisma.CommercialPaymentConditionWhereInput[] = [
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

  const conditions = await db.commercialPaymentCondition.findMany({
    where: {
      developmentId: unit.developmentId,
      isActive: true,
      OR: orScopes,
    },
    orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
  });

  // Ordena priorizando escopo mais específico: UNIT > TYPOLOGY > BLOCK > DEVELOPMENT
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

  return conditions
    .sort((a, b) => scopePriority(a) - scopePriority(b))
    .map((c) => sanitizePaymentConditionForViewer(c, viewer));
}
