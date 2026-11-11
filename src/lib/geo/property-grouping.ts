/**
 * ÁREA NOBRE — FASE 2 | BLOCO 05
 * F2.B05.3G.4 — Agrupamento de Imóveis Compartilhados no Mapa e nas Buscas
 * 
 * Centraliza a lógica de consolidação de anúncios ativos vinculados à mesma
 * identidade física (PhysicalProperty), preservando a independência comercial
 * dos corretores e a integridade de imóveis legados e unidades autônomas.
 */

export interface CoListingSummary {
  id: string;
  title: string;
  price: number;
  isPrimaryListing?: boolean;
  listingSlot?: number | null;
  createdAt?: string | Date;
  responsibleBroker?: {
    id: string;
    name: string;
    email?: string;
    profile?: {
      commercialName?: string | null;
      phone?: string | null;
      creci?: string | null;
      avatarUrl?: string | null;
      logoUrl?: string | null;
      city?: string | null;
      tagline?: string | null;
    } | null;
  } | null;
  user?: {
    id?: string;
    name?: string;
    profile?: {
      commercialName?: string | null;
      phone?: string | null;
      creci?: string | null;
      avatarUrl?: string | null;
      logoUrl?: string | null;
    } | null;
  } | null;
}

/**
 * Agrupa anúncios de imóveis convencionais pela identidade física (PhysicalProperty).
 * 
 * Regras estritas:
 * 1. Anúncios com o mesmo physicalPropertyId são agrupados em um único item consolidado.
 * 2. Unidades diferentes no mesmo edifício possuem physicalPropertyId distintos e NÃO são agrupadas.
 * 3. Imóveis diferentes que coincidam em coordenadas ou endereço NÃO são agrupados.
 * 4. Imóveis legados (physicalPropertyId nulo) permanecem individuais.
 * 5. O preço de referência canônico é estritamente PhysicalProperty.sharedPrice.
 */
export function consolidateProperties<T extends {
  id: string;
  price: number;
  title?: string;
  isPrimaryListing?: boolean;
  physicalPropertyId?: string | null;
  physicalProperty?: {
    id: string;
    sharedPrice?: number | string | any | null;
    activeListingsCount?: number;
    primaryListingId?: string | null;
    listings?: any[];
  } | null;
  responsibleBrokerId?: string | null;
  responsibleBroker?: any;
  userId?: string | null;
  user?: any;
}>(rawProperties: T[], currentUserId?: string | null): Array<T & {
  canonicalPrice: number;
  brokerCount: number;
  coListings: CoListingSummary[];
}> {
  const physicalGroupMap = new Map<string, T[]>();
  const legacyProperties: Array<T & {
    canonicalPrice: number;
    brokerCount: number;
    coListings: CoListingSummary[];
  }> = [];

  for (const prop of rawProperties) {
    if (prop.physicalPropertyId) {
      const list = physicalGroupMap.get(prop.physicalPropertyId) || [];
      list.push(prop);
      physicalGroupMap.set(prop.physicalPropertyId, list);
    } else {
      // Imóvel legado sem physicalPropertyId: mantém comportamento individual preexistente
      legacyProperties.push({
        ...prop,
        canonicalPrice: prop.price,
        brokerCount: 1,
        coListings: [
          {
            id: prop.id,
            title: prop.title || 'Anúncio do imóvel',
            price: prop.price,
            isPrimaryListing: true,
            responsibleBroker: prop.responsibleBroker || prop.user,
          },
        ],
      });
    }
  }

  const consolidatedList: Array<T & {
    canonicalPrice: number;
    brokerCount: number;
    coListings: CoListingSummary[];
  }> = [];

  physicalGroupMap.forEach((groupings, physicalId) => {
    // Se o corretor autenticado possui um anúncio ativo próprio nesta unidade, prioriza o anúncio próprio como representação
    const userListing = currentUserId
      ? groupings.find((g) => (g.responsibleBrokerId && g.responsibleBrokerId === currentUserId) || g.userId === currentUserId)
      : null;

    // Caso contrário, elege o anúncio de representação (preferência ao primário oficial ou mais antigo)
    const primary = userListing || groupings.find((g) => g.isPrimaryListing) || groupings[0];

    // Preço canônico obrigatório: PhysicalProperty.sharedPrice
    const sharedPrice = primary.physicalProperty?.sharedPrice != null
      ? Number(primary.physicalProperty.sharedPrice)
      : primary.price;

    // Consolidação de todos os co-anúncios ativos conhecidos
    const coListingsMap = new Map<string, CoListingSummary>();

    // 1. Co-anúncios presentes na lista atual
    for (const g of groupings) {
      coListingsMap.set(g.id, {
        id: g.id,
        title: g.title || 'Anúncio do imóvel',
        price: sharedPrice,
        isPrimaryListing: Boolean(g.isPrimaryListing),
        responsibleBroker: g.responsibleBroker || g.user,
      });
    }

    // 2. Co-anúncios informados na relação physicalProperty.listings (se disponível)
    if (primary.physicalProperty?.listings && Array.isArray(primary.physicalProperty.listings)) {
      for (const l of primary.physicalProperty.listings) {
        if (!coListingsMap.has(l.id)) {
          coListingsMap.set(l.id, {
            id: l.id,
            title: l.title || 'Anúncio do imóvel',
            price: sharedPrice,
            isPrimaryListing: Boolean(l.isPrimaryListing),
            responsibleBroker: l.responsibleBroker || l.user,
          });
        }
      }
    }

    const coListings = Array.from(coListingsMap.values()).sort((a, b) => {
      // Prioriza anúncio representativo selecionado
      if (a.id === primary.id) return -1;
      if (b.id === primary.id) return 1;
      if (a.isPrimaryListing && !b.isPrimaryListing) return -1;
      if (!a.isPrimaryListing && b.isPrimaryListing) return 1;
      return 0;
    });

    const brokerCount = Math.max(
      coListings.length,
      primary.physicalProperty?.activeListingsCount || 1
    );

    consolidatedList.push({
      ...primary,
      price: sharedPrice,
      canonicalPrice: sharedPrice,
      brokerCount,
      coListings,
    });
  });

  return [...consolidatedList, ...legacyProperties];
}

/**
 * Consolida matches de buscas para que múltiplas ofertas do mesmo imóvel físico
 * não dupliquem cards nem marcadores no mapa de busca, apresentando os corretores
 * disponíveis sem favorecimento automático.
 */
export function consolidateMatches(rawMatches: any[]): any[] {
  const physicalGroupMap = new Map<string, any[]>();
  const nonGrouped: any[] = [];

  for (const m of rawMatches) {
    if (m.offerType === 'PROPERTY' && m.property) {
      const physId = m.property.physicalPropertyId || m.property.physicalProperty?.id;
      if (physId) {
        const list = physicalGroupMap.get(physId) || [];
        list.push(m);
        physicalGroupMap.set(physId, list);
        continue;
      }
    }
    nonGrouped.push(m);
  }

  const consolidated: any[] = [];

  physicalGroupMap.forEach((matchesGroup) => {
    // Escolhe o match com maior score (ou o primário) para liderar a apresentação
    const leadMatch = [...matchesGroup].sort((a, b) => (b.score || 0) - (a.score || 0))[0];

    const canonicalPrice = leadMatch.property.physicalProperty?.sharedPrice != null
      ? Number(leadMatch.property.physicalProperty.sharedPrice)
      : (Number(leadMatch.property.price) || 0);

    const coListingsMap = new Map<string, CoListingSummary>();

    for (const mg of matchesGroup) {
      if (mg.property) {
        coListingsMap.set(mg.property.id, {
          id: mg.property.id,
          title: mg.property.title,
          price: canonicalPrice,
          isPrimaryListing: Boolean(mg.property.isPrimaryListing),
          responsibleBroker: mg.property.responsibleBroker || mg.property.user,
        });
      }
    }

    if (leadMatch.property.physicalProperty?.listings && Array.isArray(leadMatch.property.physicalProperty.listings)) {
      for (const l of leadMatch.property.physicalProperty.listings) {
        if (!coListingsMap.has(l.id)) {
          coListingsMap.set(l.id, {
            id: l.id,
            title: l.title,
            price: canonicalPrice,
            isPrimaryListing: Boolean(l.isPrimaryListing),
            responsibleBroker: l.responsibleBroker || l.user,
          });
        }
      }
    }

    const coListings = Array.from(coListingsMap.values()).sort((a, b) => {
      if (a.isPrimaryListing && !b.isPrimaryListing) return -1;
      if (!a.isPrimaryListing && b.isPrimaryListing) return 1;
      return 0;
    });

    const brokerCount = Math.max(
      coListings.length,
      leadMatch.property.physicalProperty?.activeListingsCount || 1
    );

    consolidated.push({
      ...leadMatch,
      brokerCount,
      coListings,
      property: {
        ...leadMatch.property,
        price: canonicalPrice,
        canonicalPrice,
        brokerCount,
        coListings,
      },
    });
  });

  return [...consolidated, ...nonGrouped].sort((a, b) => (b.score || 0) - (a.score || 0));
}

// ==============================================================================
// ÁREA NOBRE — ETAPA J.2.C.5
// Agrupamento de Apartamentos por Edifício no Mapa
// ==============================================================================

export interface BuildingUnitDetail {
  id: string; // ID do anúncio representativo
  physicalPropertyId: string;
  unitId?: string | null;
  unitNumber?: string | null;
  normalizedUnit?: string | null;
  tower?: string | null;
  floor: number | null;
  floorLabel: string;
  title: string;
  price: number; // Preço canônico compartilhado
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpaces: number;
  privateArea?: number | null;
  totalArea?: number | null;
  coListings: CoListingSummary[];
  isMine: boolean;
  coverImageUrl?: string | null;
  status: string;
  property: any;
}

export interface BuildingFloorGroup {
  floor: number | null;
  floorLabel: string;
  units: BuildingUnitDetail[];
}

export interface BuildingGroupItem {
  id: string;
  isBuildingGroup: true;
  isDevelopment: false;
  buildingId: string;
  name: string;
  normalizedName?: string | null;
  alternativeNames?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  latitude: number;
  longitude: number;
  coverImageUrl?: string | null;
  boundary?: string | null;
  boundaryArea?: number | null;
  totalUnitsCount: number; // Quantidade de unidades físicas distintas disponíveis
  totalListingsCount: number; // Quantidade total de anúncios vinculados
  minPrice: number; // Menor preço canônico
  floors: BuildingFloorGroup[];
  units: BuildingUnitDetail[];
  hasMyListing: boolean;
  propertyType: string;
  purpose: string;
  title: string;
  price: number;
}

export function extractFloorNumber(
  floorValue: number | null | undefined,
  unitNumber?: string | null,
  complement?: string | null,
  title?: string | null
): number | null {
  if (floorValue !== null && floorValue !== undefined && !isNaN(Number(floorValue))) {
    return Number(floorValue);
  }

  const combined = `${unitNumber || ''} ${complement || ''} ${title || ''}`.trim();
  if (!combined) return null;

  // 1. Padrão explícito: "3º andar", "4 andar", "10º pav"
  const matchAndar = combined.match(/\b(\d+)\s*[ºªo°]?\s*(?:andar|pavimento|pav)\b/i);
  if (matchAndar) {
    return parseInt(matchAndar[1], 10);
  }

  // 2. Padrão numérico de unidade autônoma clássica: "301", "401", "1204", "Ap 302"
  const matchUnit = combined.match(/\b(?:ap|apto|apartamento|unidade|unid)?\s*([1-9][0-9]{2,3})\b/i);
  if (matchUnit) {
    const num = parseInt(matchUnit[1], 10);
    return Math.floor(num / 100);
  }

  return null;
}

export function formatFloorLabel(floor: number | null): string {
  if (floor === null || floor === undefined) return 'Andar não informado';
  if (floor === 0) return 'Térreo';
  if (floor < 0) return `${Math.abs(floor)}º Subsolo`;
  return `${floor}º Andar`;
}

/**
 * Agrupa apartamentos pelo Edifício mestre, garantindo a hierarquia estrita:
 * Edifício > Andar > Unidade Física (PhysicalProperty / BuildingUnit) > Anúncio (Property) > Corretor
 * 
 * Imóveis que não pertencem a edifícios cadastrados (casas, terrenos e empreendimentos)
 * são preservados de forma individual e independente.
 */
export function groupPropertiesForMap<T extends {
  id: string;
  price?: number;
  canonicalPrice?: number;
  title?: string;
  name?: string;
  isDevelopment?: boolean;
  propertyType?: string;
  purpose?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  buildingId?: string | null;
  building?: any;
  physicalPropertyId?: string | null;
  physicalProperty?: any;
  coListings?: CoListingSummary[];
  brokerCount?: number;
  images?: any[];
  bedrooms?: number;
  suites?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  privateArea?: number | null;
  totalArea?: number | null;
  status?: string;
  userId?: string | null;
  responsibleBrokerId?: string | null;
}>(
  items: T[],
  currentUserId?: string | null
): {
  buildingGroups: BuildingGroupItem[];
  standaloneItems: T[];
  allMapEntities: Array<BuildingGroupItem | T>;
} {
  const buildingMap = new Map<string, T[]>();
  const standaloneItems: T[] = [];

  for (const item of items) {
    // Empreendimentos em lançamento já possuem agrupamento próprio de tipologias
    if (item.isDevelopment) {
      standaloneItems.push(item);
      continue;
    }

    const b = item.building || item.physicalProperty?.building;
    const bId = item.buildingId || item.physicalProperty?.buildingId || b?.id;

    const hasValidCoords =
      b &&
      b.latitude != null &&
      b.longitude != null &&
      !isNaN(b.latitude) &&
      !isNaN(b.longitude);

    // Apenas agrupa se for apartamento vinculado a um Edifício válido com coordenadas
    const isApartment = (item.propertyType || '').toLowerCase() === 'apartamento';

    if (bId && b && hasValidCoords && isApartment) {
      const list = buildingMap.get(bId) || [];
      list.push(item);
      buildingMap.set(bId, list);
    } else {
      standaloneItems.push(item);
    }
  }

  const buildingGroups: BuildingGroupItem[] = [];

  buildingMap.forEach((buildingProps, bId) => {
    const firstProp = buildingProps[0];
    const b = firstProp.building || firstProp.physicalProperty?.building;

    const units: BuildingUnitDetail[] = buildingProps.map((p) => {
      const unitInfo = p.physicalProperty?.unit;
      const unitNum = unitInfo?.unitNumber || (p as any).unitNumber || null;
      const complement = (p as any).complement || null;
      const title = p.title || 'Apartamento';

      const tower = unitInfo?.tower || (p as any).tower || null;
      const floor = extractFloorNumber(unitInfo?.floor, unitNum, complement, title);
      const baseFloorLabel = formatFloorLabel(floor);
      const floorLabel = tower ? `${tower} — ${baseFloorLabel}` : baseFloorLabel;

      const price = p.canonicalPrice != null ? Number(p.canonicalPrice) : Number(p.price);

      const coListings = p.coListings || [
        {
          id: p.id,
          title,
          price,
          isPrimaryListing: true,
          responsibleBroker: (p as any).responsibleBroker || (p as any).user,
        },
      ];

      const isMine =
        (currentUserId && p.responsibleBrokerId === currentUserId) ||
        (currentUserId && p.userId === currentUserId) ||
        (currentUserId &&
          coListings.some(
            (c: any) =>
              c.responsibleBroker?.id === currentUserId ||
              c.user?.id === currentUserId ||
              c.responsibleBrokerId === currentUserId ||
              c.userId === currentUserId
          ));

      const coverImg =
        p.images && p.images.length > 0
          ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].url)
          : null;

      return {
        id: p.id,
        physicalPropertyId: p.physicalPropertyId || p.physicalProperty?.id || p.id,
        unitId: unitInfo?.id || null,
        unitNumber: unitNum,
        normalizedUnit: unitInfo?.normalizedUnit || null,
        tower: unitInfo?.tower || null,
        floor,
        floorLabel,
        title,
        price,
        bedrooms: unitInfo?.bedrooms ?? p.bedrooms ?? 0,
        suites: unitInfo?.suites ?? p.suites ?? 0,
        bathrooms: unitInfo?.bathrooms ?? p.bathrooms ?? 0,
        parkingSpaces: unitInfo?.parkingSpaces ?? p.parkingSpaces ?? 0,
        privateArea: unitInfo?.privateArea ?? p.privateArea ?? null,
        totalArea: unitInfo?.totalArea ?? p.totalArea ?? null,
        coListings,
        isMine: Boolean(isMine),
        coverImageUrl: coverImg,
        status: p.status || 'Disponível',
        property: p,
      };
    });

    // Agrupamento por andar e torre
    const floorMap = new Map<string, { floor: number | null; tower: string | null; floorLabel: string; units: BuildingUnitDetail[] }>();

    for (const u of units) {
      const towerPrefix = u.tower ? `tower_${u.tower.trim().toLowerCase()}_` : '';
      const key = u.floor !== null ? `${towerPrefix}floor_${u.floor}` : `${towerPrefix}floor_unknown`;
      const entry = floorMap.get(key) || {
        floor: u.floor,
        tower: u.tower,
        floorLabel: u.floorLabel,
        units: [],
      };
      entry.units.push(u);
      floorMap.set(key, entry);
    }

    // Ordenação dos andares (Torre primeiro, depois crescente por andar; nulos ao fim)
    const sortedFloors = Array.from(floorMap.values()).sort((a, b) => {
      if (a.tower && b.tower && a.tower !== b.tower) {
        return a.tower.localeCompare(b.tower, undefined, { numeric: true });
      }
      if (a.tower && !b.tower) return -1;
      if (!a.tower && b.tower) return 1;

      if (a.floor === null && b.floor !== null) return 1;
      if (a.floor !== null && b.floor === null) return -1;
      if (a.floor === null && b.floor === null) return 0;
      return (a.floor as number) - (b.floor as number);
    });

    // Ordenação das unidades dentro de cada andar por número de unidade ou preço
    sortedFloors.forEach((f) => {
      f.units.sort((a, b) => {
        if (a.unitNumber && b.unitNumber) {
          return a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true });
        }
        return a.price - b.price;
      });
    });

    const prices = units.map((u) => u.price).filter((pr) => pr > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : Number(firstProp.price) || 0;

    const totalListingsCount = units.reduce(
      (acc, u) => acc + Math.max(u.coListings.length, 1),
      0
    );

    const hasMyListing = units.some((u) => u.isMine);

    buildingGroups.push({
      id: `bgroup_${bId}`,
      isBuildingGroup: true,
      isDevelopment: false,
      buildingId: bId,
      name: b.name || 'Edifício',
      normalizedName: b.normalizedName,
      alternativeNames: b.alternativeNames,
      address: b.address || firstProp.address,
      neighborhood: b.neighborhood || firstProp.neighborhood,
      city: b.city || firstProp.city || 'Criciúma',
      latitude: b.latitude,
      longitude: b.longitude,
      coverImageUrl: b.coverImageUrl || null,
      boundary: b.boundary || null,
      boundaryArea: b.boundaryArea || null,
      totalUnitsCount: units.length,
      totalListingsCount,
      minPrice,
      floors: sortedFloors,
      units,
      hasMyListing,
      propertyType: 'Apartamento',
      purpose: firstProp.purpose || 'Venda',
      title: b.name || 'Edifício',
      price: minPrice,
    });
  });

  return {
    buildingGroups,
    standaloneItems,
    allMapEntities: [...buildingGroups, ...standaloneItems],
  };
}


