/**
 * ÁREA NOBRE — ETAPA J.2.E.2
 * Serviço de Consulta Pública da Página Compartilhada do Edifício
 * 
 * Camada de acesso a dados (DAL) para a rota /edificios/[id], garantindo:
 * - Consultas otimizadas sem N+1.
 * - Filtro estrito de visibilidade (somente status = 'Disponível').
 * - Hierarquia canônica: Edifício > Torre > Andar > Unidade Física > Corretores.
 * - Preço compartilhado canônico (PhysicalProperty.sharedPrice).
 * - Neutralidade e rotação diária determinística entre anunciantes.
 * - DTO público seguro sem dados privados ou administrativos.
 */

import { prisma } from '@/lib/db';
import {
  PublicBuildingDTO,
  PublicBuildingFloorDTO,
  PublicBuildingUnitDTO,
  PublicBuildingListingDTO,
  PublicBuildingBrokerDTO,
  getDailyRotationKey,
  getDeterministicBrokerScore,
} from '@/lib/public-building-dto';
import {
  extractFloorNumber,
  formatFloorLabel,
} from '@/lib/geo/property-grouping';

export interface GetPublicBuildingOptions {
  currentUserId?: string | null;
  dateKey?: string;
  prismaClient?: any;
}

/**
 * Consulta um edifício e seus apartamentos ativos no acervo público.
 * Retorna null caso o edifício não exista ou não esteja ativo.
 */
export async function getPublicBuildingById(
  buildingId: string,
  options: GetPublicBuildingOptions = {}
): Promise<PublicBuildingDTO | null> {
  if (!buildingId || typeof buildingId !== 'string') {
    return null;
  }

  const client = options.prismaClient || prisma;
  const currentUserId = options.currentUserId || null;
  const dateKey = options.dateKey || getDailyRotationKey();

  // 1. Busca dados mestres do edifício com seleção explícita e segura
  const building = await client.building.findUnique({
    where: { id: buildingId },
    select: {
      id: true,
      name: true,
      address: true,
      number: true,
      neighborhood: true,
      city: true,
      state: true,
      zipcode: true,
      latitude: true,
      longitude: true,
      geoValidationStatus: true,
      coverImageUrl: true,
      coverImageValidationStatus: true,
      boundary: true,
      boundaryArea: true,
      boundaryValidationStatus: true,
      totalFloors: true,
      unitsPerFloor: true,
      towers: true,
      hasPool: true,
      hasGym: true,
      hasPartyHall: true,
      hasElevator: true,
      hasPetSpace: true,
      hasBarbecue: true,
      status: true,
    },
  });

  if (!building) {
    return null;
  }

  // Edifícios inativos/mesclados não possuem página pública ativa
  if (building.status === 'INACTIVE' || building.status === 'MERGED') {
    return null;
  }

  // 2. Busca anúncios ativos exclusivamente com status "Disponível" vinculados ao edifício
  const rawListings = await client.property.findMany({
    where: {
      buildingId,
      status: 'Disponível',
    },
    select: {
      id: true,
      title: true,
      price: true,
      status: true,
      images: true,
      bedrooms: true,
      suites: true,
      bathrooms: true,
      parkingSpaces: true,
      privateArea: true,
      totalArea: true,
      userId: true,
      responsibleBrokerId: true,
      physicalPropertyId: true,
      isPrimaryListing: true,
      createdAt: true,
      physicalProperty: {
        select: {
          id: true,
          sharedPrice: true,
          activeListingsCount: true,
          unit: {
            select: {
              id: true,
              unitNumber: true,
              normalizedUnit: true,
              tower: true,
              floor: true,
              bedrooms: true,
              suites: true,
              bathrooms: true,
              parkingSpaces: true,
              privateArea: true,
              totalArea: true,
            },
          },
        },
      },
      responsibleBroker: {
        select: {
          id: true,
          name: true,
          profile: {
            select: {
              commercialName: true,
              phone: true,
              creci: true,
              avatarUrl: true,
              logoUrl: true,
              tagline: true,
              city: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          profile: {
            select: {
              commercialName: true,
              phone: true,
              creci: true,
              avatarUrl: true,
              logoUrl: true,
              tagline: true,
              city: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 3. Agrupamento Canônico por Unidade Física (PhysicalProperty / BuildingUnit)
  // Uma unidade física anunciada por múltiplos corretores aparece EXATAMENTE UMA VEZ
  const physicalMap = new Map<string, typeof rawListings>();

  for (const listing of rawListings) {
    // Identificador canônico da unidade: physicalPropertyId ou, se legado, ID do anúncio
    const key = listing.physicalPropertyId || `standalone_${listing.id}`;
    const group = physicalMap.get(key) || [];
    group.push(listing);
    physicalMap.set(key, group);
  }

  const consolidatedUnits: PublicBuildingUnitDTO[] = [];

  physicalMap.forEach((listings, physicalKey) => {
    const first = listings[0];
    const unitInfo = first.physicalProperty?.unit;

    // Preço canônico compartilhado: prioriza PhysicalProperty.sharedPrice
    let canonicalPrice = Number(first.price);
    if (first.physicalProperty?.sharedPrice != null) {
      const parsedShared = Number(first.physicalProperty.sharedPrice);
      if (!isNaN(parsedShared) && parsedShared > 0) {
        canonicalPrice = parsedShared;
      }
    }

    const unitNumber = unitInfo?.unitNumber || null;
    const tower = unitInfo?.tower || null;
    const title = unitNumber ? `Apartamento ${unitNumber}` : first.title;

    // Extração inteligente de pavimento (reutilizando motor de geo/property-grouping)
    const floor = extractFloorNumber(unitInfo?.floor, unitNumber, null, title);
    const baseFloorLabel = formatFloorLabel(floor);
    const floorLabel = tower ? `${tower} — ${baseFloorLabel}` : baseFloorLabel;

    // 4. Mapeamento dos Co-anúncios e Ordenação Neutra com Rotação Periódica
    const publicListings: PublicBuildingListingDTO[] = listings.map((l: any) => {
      const brokerUser = l.responsibleBroker || l.user;
      const brokerProfile = brokerUser?.profile;

      const brokerDTO: PublicBuildingBrokerDTO = {
        id: brokerUser?.id || '',
        name: brokerUser?.name || 'Corretor Parceiro',
        commercialName: brokerProfile?.commercialName || brokerUser?.name || 'Corretor Parceiro',
        phone: brokerProfile?.phone || null,
        creci: brokerProfile?.creci || null,
        avatarUrl: brokerProfile?.avatarUrl || null,
        logoUrl: brokerProfile?.logoUrl || null,
        tagline: brokerProfile?.tagline || null,
        city: brokerProfile?.city || null,
      };

      // Imagens públicas seguras
      let imagesList: Array<{ id: string; url: string; isCover?: boolean }> = [];
      if (Array.isArray(l.images)) {
        imagesList = l.images
          .map((img: any, idx: number) => {
            if (typeof img === 'string') {
              return { id: `img_${idx}`, url: img, isCover: idx === 0 };
            }
            if (img && typeof img.url === 'string') {
              return { id: img.id || `img_${idx}`, url: img.url, isCover: Boolean(img.isCover || idx === 0) };
            }
            return null;
          })
          .filter(Boolean) as any[];
      }

      const isMine = currentUserId
        ? (l.responsibleBrokerId === currentUserId || l.userId === currentUserId)
        : false;

      return {
        id: l.id,
        title: l.title || title,
        price: canonicalPrice, // Exibe o preço canônico compartilhado
        broker: brokerDTO,
        images: imagesList,
        isMine,
      };
    });

    // Ordenação Neutra Determinística:
    // Evita favorecimento de data de cadastro ou isPrimaryListing na visualização pública.
    // Utiliza hash determinístico com a chave da data atual para rotação equitativa diária.
    publicListings.sort((a, b) => {
      const scoreA = getDeterministicBrokerScore(dateKey, physicalKey, a.id);
      const scoreB = getDeterministicBrokerScore(dateKey, physicalKey, b.id);
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return a.id.localeCompare(b.id);
    });

    const hasMyListing = publicListings.some((l) => l.isMine);

    consolidatedUnits.push({
      physicalPropertyId: physicalKey,
      unitId: unitInfo?.id || null,
      unitNumber,
      tower,
      floor,
      floorLabel,
      title,
      price: canonicalPrice,
      bedrooms: unitInfo?.bedrooms ?? first.bedrooms ?? 0,
      suites: unitInfo?.suites ?? first.suites ?? 0,
      bathrooms: unitInfo?.bathrooms ?? first.bathrooms ?? 0,
      parkingSpaces: unitInfo?.parkingSpaces ?? first.parkingSpaces ?? 0,
      privateArea: unitInfo?.privateArea ?? first.privateArea ?? null,
      totalArea: unitInfo?.totalArea ?? first.totalArea ?? null,
      listingsCount: publicListings.length,
      listings: publicListings,
      hasMyListing,
    });
  });

  // 5. Agrupamento por Andar e Torre (Hierarquia: Torre > Andar > Unidades)
  interface FloorMapEntry {
    floor: number | null;
    tower: string | null;
    floorLabel: string;
    units: PublicBuildingUnitDTO[];
  }
  const floorMap = new Map<string, FloorMapEntry>();

  for (const unit of consolidatedUnits) {
    const towerPrefix = unit.tower ? `tower_${unit.tower.trim().toLowerCase()}_` : '';
    const key = unit.floor !== null ? `${towerPrefix}floor_${unit.floor}` : `${towerPrefix}floor_unknown`;
    const existing = floorMap.get(key);
    if (!existing) {
      floorMap.set(key, {
        floor: unit.floor,
        tower: unit.tower,
        floorLabel: unit.floorLabel,
        units: [unit],
      });
    } else {
      existing.units.push(unit);
    }
  }

  // Ordenação dos pavimentos (Torre primeiro, depois andar numérico crescente; nulos ao fim)
  const sortedFloors: PublicBuildingFloorDTO[] = Array.from(floorMap.values()).sort((a, b) => {
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

  // Ordenação interna das unidades dentro de cada andar por número da unidade ou preço
  sortedFloors.forEach((f) => {
    f.units.sort((a, b) => {
      if (a.unitNumber && b.unitNumber) {
        return a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true });
      }
      return a.price - b.price;
    });
  });

  // 6. Métricas Globais do Edifício
  const validPrices = consolidatedUnits.map((u) => u.price).filter((p) => p > 0);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
  const totalListingsCount = rawListings.length;
  const totalUnitsCount = consolidatedUnits.length;

  const hasCoords =
    building.latitude != null &&
    building.longitude != null &&
    !isNaN(building.latitude) &&
    !isNaN(building.longitude);

  let parsedTowers: string[] | null = null;
  if (building.towers) {
    try {
      const parsed = JSON.parse(building.towers);
      if (Array.isArray(parsed)) parsedTowers = parsed;
    } catch {
      parsedTowers = [building.towers];
    }
  }

  return {
    id: building.id,
    name: building.name,
    address: building.address || null,
    number: building.number || null,
    neighborhood: building.neighborhood || null,
    city: building.city || 'Criciúma',
    state: building.state || 'SC',
    zipcode: building.zipcode || null,
    latitude: building.latitude,
    longitude: building.longitude,
    hasCoordinates: hasCoords,
    geoValidationStatus: building.geoValidationStatus || 'UNVERIFIED',
    coverImageUrl: building.coverImageUrl || null,
    coverImageValidationStatus: building.coverImageValidationStatus || 'UNVERIFIED',
    boundary: building.boundary || null,
    boundaryArea: building.boundaryArea || null,
    boundaryValidationStatus: building.boundaryValidationStatus || 'UNVERIFIED',
    totalFloors: building.totalFloors || null,
    unitsPerFloor: building.unitsPerFloor || null,
    towers: parsedTowers,
    amenities: {
      hasPool: building.hasPool,
      hasGym: building.hasGym,
      hasPartyHall: building.hasPartyHall,
      hasElevator: building.hasElevator,
      hasPetSpace: building.hasPetSpace,
      hasBarbecue: building.hasBarbecue,
    },
    totalUnitsCount,
    totalListingsCount,
    minPrice,
    floors: sortedFloors,
    hasAvailableUnits: totalUnitsCount > 0,
  };
}

/**
 * Gera metadados de SEO para páginas de edifícios (Server Components).
 */
export async function getPublicBuildingMetadata(buildingId: string) {
  const building = await getPublicBuildingById(buildingId);
  if (!building) {
    return {
      title: 'Edifício Não Encontrado | Área Nobre',
      description: 'Edifício não localizado no cadastro compartilhado do Área Nobre.',
      robots: { index: false, follow: false },
    };
  }

  const locationText = building.neighborhood
    ? `${building.neighborhood}, ${building.city}/${building.state}`
    : `${building.city}/${building.state}`;

  const priceText = building.minPrice
    ? `A partir de R$ ${building.minPrice.toLocaleString('pt-BR')}`
    : 'Consulte unidades';

  const unitsText = building.totalUnitsCount > 0
    ? `${building.totalUnitsCount} ${building.totalUnitsCount === 1 ? 'apartamento disponível' : 'apartamentos disponíveis'}`
    : 'Cadastro mestre de condomínio';

  const title = `${building.name} — ${locationText} | Área Nobre`;
  const description = `${building.name} em ${locationText}. ${unitsText} (${priceText}). Fotos da fachada, localização, perímetro e corretores parceiros credenciados.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: building.coverImageUrl ? [{ url: building.coverImageUrl, alt: `Fachada ${building.name}` }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: building.coverImageUrl ? [building.coverImageUrl] : [],
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'ApartmentComplex',
      name: building.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: [building.address, building.number].filter(Boolean).join(', '),
        addressLocality: building.city,
        addressRegion: building.state,
        postalCode: building.zipcode || undefined,
        addressCountry: 'BR',
      },
      geo: building.hasCoordinates
        ? {
            '@type': 'GeoCoordinates',
            latitude: building.latitude,
            longitude: building.longitude,
          }
        : undefined,
      image: building.coverImageUrl || undefined,
    },
  };
}
