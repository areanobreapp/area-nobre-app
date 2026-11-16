/**
 * ÁREA NOBRE — BLOCO 6B — Regras centrais das Unidades Comerciais (Ajustes da Etapa 6B.3.1)
 *
 * Módulo PURO (sem Prisma, sem dependências de servidor) para ser reutilizado de forma idêntica por:
 * - Serviço de domínio (`commercial-unit-service.ts`) e APIs;
 * - Formulário administrativo (cálculo em tempo real);
 * - Listagem, ficha detalhada e consulta do corretor.
 *
 * Assim, R$/m², totais de dormitórios, banheiros e vagas apresentam resultados idênticos em todos os pontos.
 *
 * Referência de nomenclatura e regras: cadastro de imóveis usados (`PropertyForm.tsx` / `field-help.ts`).
 */

export type CommercialUnitTypeKey =
  | 'APARTAMENTO'
  | 'COBERTURA'
  | 'STUDIO'
  | 'SALA_COMERCIAL'
  | 'CASA'
  | 'LOTE';

/** Categoria funcional que define quais metragens e características se aplicam. */
export type CommercialUnitCategory = 'VERTICAL' | 'HOUSE' | 'LOT';

/**
 * Tipo da metragem utilizada como denominador do R$/m².
 * `USABLE` é mantido no tipo apenas por compatibilidade de contrato; não é mais utilizado no cálculo.
 */
export type ReferenceAreaType = 'USABLE' | 'PRIVATE' | 'BUILT' | 'LAND' | null;

export const REFERENCE_AREA_LABELS: Record<Exclude<ReferenceAreaType, null>, string> = {
  USABLE: 'Área útil',
  PRIVATE: 'Área privativa',
  BUILT: 'Área construída',
  LAND: 'Área do terreno',
};

export function normalizeUnitType(unitType?: string | null): CommercialUnitTypeKey {
  const t = String(unitType || 'APARTAMENTO').toUpperCase();
  if (
    t === 'APARTAMENTO' ||
    t === 'COBERTURA' ||
    t === 'STUDIO' ||
    t === 'SALA_COMERCIAL' ||
    t === 'CASA' ||
    t === 'LOTE'
  ) {
    return t;
  }
  return 'APARTAMENTO';
}

export function getUnitCategory(unitType?: string | null): CommercialUnitCategory {
  const t = normalizeUnitType(unitType);
  if (t === 'LOTE') return 'LOT';
  if (t === 'CASA') return 'HOUSE';
  return 'VERTICAL';
}

/** Dormitórios e suítes não se aplicam a salas comerciais nem a lotes. */
export function unitTypeHasBedrooms(unitType?: string | null): boolean {
  const t = normalizeUnitType(unitType);
  return t !== 'SALA_COMERCIAL' && t !== 'LOTE';
}

/** Banheiros, lavabos e vagas não se aplicam a lotes/terrenos. */
export function unitTypeHasBathrooms(unitType?: string | null): boolean {
  return normalizeUnitType(unitType) !== 'LOTE';
}

function positiveOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonNegativeInt(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// ---------------------------------------------------------------------------
// PREÇO DE REFERÊNCIA E R$/m²
// ---------------------------------------------------------------------------

/** Preço de referência: promocional válido quando informado; caso contrário, preço de tabela. */
export function resolveEffectivePrice(unit: {
  listPrice?: number | null;
  promotionalPrice?: number | null;
}): number | null {
  const promo = positiveOrNull(unit.promotionalPrice);
  if (promo != null) return promo;
  return positiveOrNull(unit.listPrice);
}

/**
 * REGRA DEFINITIVA DO DENOMINADOR DO R$/m² (sem fallback automático para outra metragem):
 * - APARTAMENTO, COBERTURA, STUDIO, SALA_COMERCIAL → exclusivamente Área privativa.
 * - CASA → exclusivamente Área construída (mesmo critério de metragem principal das casas nos imóveis usados).
 * - LOTE → exclusivamente Área do terreno.
 * A Área útil e a Área total nunca são utilizadas como denominador.
 * Se a metragem exigida não estiver informada ou for inválida, o R$/m² fica indisponível (null).
 */
export function resolveReferenceArea(unit: {
  unitType?: string | null;
  privateArea?: number | null;
  builtArea?: number | null;
  landArea?: number | null;
}): {
  referenceArea: number | null;
  referenceAreaType: ReferenceAreaType;
  referenceAreaLabel: string | null;
  requiredAreaLabel: string;
} {
  const category = getUnitCategory(unit.unitType);

  if (category === 'LOT') {
    const area = positiveOrNull(unit.landArea);
    return {
      referenceArea: area,
      referenceAreaType: area != null ? 'LAND' : null,
      referenceAreaLabel: area != null ? REFERENCE_AREA_LABELS.LAND : null,
      requiredAreaLabel: REFERENCE_AREA_LABELS.LAND,
    };
  }

  if (category === 'HOUSE') {
    const area = positiveOrNull(unit.builtArea);
    return {
      referenceArea: area,
      referenceAreaType: area != null ? 'BUILT' : null,
      referenceAreaLabel: area != null ? REFERENCE_AREA_LABELS.BUILT : null,
      requiredAreaLabel: REFERENCE_AREA_LABELS.BUILT,
    };
  }

  const area = positiveOrNull(unit.privateArea);
  return {
    referenceArea: area,
    referenceAreaType: area != null ? 'PRIVATE' : null,
    referenceAreaLabel: area != null ? REFERENCE_AREA_LABELS.PRIVATE : null,
    requiredAreaLabel: REFERENCE_AREA_LABELS.PRIVATE,
  };
}

export function computePricePerSqm(unit: {
  unitType?: string | null;
  listPrice?: number | null;
  promotionalPrice?: number | null;
  privateArea?: number | null;
  builtArea?: number | null;
  landArea?: number | null;
}) {
  const effectivePrice = resolveEffectivePrice(unit);
  const ref = resolveReferenceArea(unit);
  const pricePerSqm =
    effectivePrice != null && ref.referenceArea != null
      ? Number((effectivePrice / ref.referenceArea).toFixed(2))
      : null;

  return {
    effectivePrice,
    referenceArea: ref.referenceArea,
    referenceAreaType: ref.referenceAreaType,
    referenceAreaLabel: ref.referenceAreaLabel,
    requiredAreaLabel: ref.requiredAreaLabel,
    pricePerSqm,
  };
}

export function computeDiscountPercent(unit: {
  listPrice?: number | null;
  promotionalPrice?: number | null;
}): number | null {
  const list = positiveOrNull(unit.listPrice);
  const promo = positiveOrNull(unit.promotionalPrice);
  if (list == null || promo == null || promo >= list) return null;
  return Number((((list - promo) / list) * 100).toFixed(2));
}

// ---------------------------------------------------------------------------
// DORMITÓRIOS E BANHEIROS (mesma regra do cadastro de imóveis usados)
// ---------------------------------------------------------------------------

/**
 * Total de Dormitórios = Suítes + Dormitórios Extras.
 * Total de Banheiros  = Suítes + Banheiros Sociais + Lavabos (cada suíte corresponde a um banheiro).
 */
export function computeRoomTotals(input: {
  suites?: number | string | null;
  extraBedrooms?: number | string | null;
  socialBathrooms?: number | string | null;
  lavabos?: number | string | null;
}) {
  const suites = nonNegativeInt(input.suites);
  const extraBedrooms = nonNegativeInt(input.extraBedrooms);
  const socialBathrooms = nonNegativeInt(input.socialBathrooms);
  const lavabos = nonNegativeInt(input.lavabos);
  return {
    suites,
    extraBedrooms,
    socialBathrooms,
    lavabos,
    totalBedrooms: suites + extraBedrooms,
    totalBathrooms: suites + socialBathrooms + lavabos,
  };
}

/**
 * Deriva a discriminação a partir das colunas persistidas, sem migração:
 * - `bedrooms`  = Total de Dormitórios  → Dormitórios Extras = bedrooms − suites;
 * - `bathrooms` = Total de Banheiros    → Banheiros Sociais  = bathrooms − suites − lavabos.
 * `isInconsistent` sinaliza registros cujo total salvo é menor que a soma mínima (dados legados).
 */
export function deriveRoomBreakdown(unit: {
  bedrooms?: number | null;
  suites?: number | null;
  bathrooms?: number | null;
  lavabos?: number | null;
}) {
  const suites = nonNegativeInt(unit.suites);
  const lavabos = nonNegativeInt(unit.lavabos);
  const bedrooms = nonNegativeInt(unit.bedrooms);
  const bathrooms = nonNegativeInt(unit.bathrooms);

  const extraBedrooms = Math.max(0, bedrooms - suites);
  const socialBathrooms = Math.max(0, bathrooms - suites - lavabos);

  const totals = computeRoomTotals({ suites, extraBedrooms, socialBathrooms, lavabos });

  return {
    ...totals,
    storedBedrooms: bedrooms,
    storedBathrooms: bathrooms,
    isInconsistent: bedrooms < suites || bathrooms < suites + lavabos,
  };
}

// ---------------------------------------------------------------------------
// VAGAS (mesma regra do cadastro de imóveis usados)
// ---------------------------------------------------------------------------

/** Vagas totais = cobertas + descobertas, quando ao menos uma das duas for informada. */
export function computeParkingTotal(input: {
  coveredParkingSpaces?: number | string | null;
  uncoveredParkingSpaces?: number | string | null;
  parkingSpaces?: number | string | null;
}): number {
  const hasCovered =
    input.coveredParkingSpaces !== null &&
    input.coveredParkingSpaces !== undefined &&
    input.coveredParkingSpaces !== '';
  const hasUncovered =
    input.uncoveredParkingSpaces !== null &&
    input.uncoveredParkingSpaces !== undefined &&
    input.uncoveredParkingSpaces !== '';
  if (hasCovered || hasUncovered) {
    return nonNegativeInt(input.coveredParkingSpaces) + nonNegativeInt(input.uncoveredParkingSpaces);
  }
  return nonNegativeInt(input.parkingSpaces);
}

// ---------------------------------------------------------------------------
// METRAGEM PRINCIPAL DE EXIBIÇÃO (resumo / cartões)
// ---------------------------------------------------------------------------

export interface PrimaryAreaSummary {
  value: number | null;
  label: string;
  shortLabel: string;
}

/**
 * Metragem exibida na visão resumida. Sempre identifica corretamente a metragem apresentada
 * (nunca apresenta outra área como "Área útil").
 * - Verticais/salas: Área privativa (na ausência, Área total, identificada como tal).
 * - Casas: Área construída (na ausência, Área do terreno, identificada como tal).
 * - Lotes: Área do terreno.
 */
export function resolvePrimaryArea(unit: {
  unitType?: string | null;
  privateArea?: number | null;
  totalArea?: number | null;
  builtArea?: number | null;
  landArea?: number | null;
}): PrimaryAreaSummary {
  const category = getUnitCategory(unit.unitType);

  if (category === 'LOT') {
    return { value: positiveOrNull(unit.landArea), label: 'Área do terreno', shortLabel: 'Terreno' };
  }

  if (category === 'HOUSE') {
    const built = positiveOrNull(unit.builtArea);
    if (built != null) return { value: built, label: 'Área construída', shortLabel: 'Construída' };
    const land = positiveOrNull(unit.landArea);
    if (land != null) return { value: land, label: 'Área do terreno', shortLabel: 'Terreno' };
    return { value: null, label: 'Área construída', shortLabel: 'Construída' };
  }

  const priv = positiveOrNull(unit.privateArea);
  if (priv != null) return { value: priv, label: 'Área privativa', shortLabel: 'Privativa' };
  const total = positiveOrNull(unit.totalArea);
  if (total != null) return { value: total, label: 'Área total', shortLabel: 'Total' };
  return { value: null, label: 'Área privativa', shortLabel: 'Privativa' };
}

