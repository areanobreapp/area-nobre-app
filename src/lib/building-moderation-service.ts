import { prisma as defaultPrisma } from '@/lib/db';

export type ModerationItemType = 'LOCATION' | 'BOUNDARY' | 'FACADE';

export interface ModerationQueueItem {
  id: string;
  type: ModerationItemType;
  contributionType: string;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  justification?: string | null;
  decisionNotes?: string | null;
  decidedAt?: string | null;
  building: {
    id: string;
    name: string;
    address: string;
    number: string | null;
    neighborhood: string;
    city: string;
    state: string;
    currentLatitude?: number | null;
    currentLongitude?: number | null;
    currentBoundary?: string | null;
    currentBoundaryArea?: number | null;
    currentCoverImageUrl?: string | null;
    geoValidationStatus?: string;
    boundaryValidationStatus?: string;
    coverImageValidationStatus?: string;
  };
  broker: {
    id: string;
    name: string;
    email: string;
    commercialName?: string | null;
    creci?: string | null;
    phone?: string | null;
  };
  decidedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  // Campos específicos de cada tipo
  locationData?: {
    latitude: number;
    longitude: number;
    distanceFromCurrent?: number | null;
  };
  boundaryData?: {
    boundary: string;
    boundaryArea?: number | null;
    landParcelId?: string | null;
  };
  facadeData?: {
    imageUrl: string;
  };
}

export interface ModerationSummary {
  totalPending: number;
  locationPending: number;
  boundaryPending: number;
  facadePending: number;
  divergentBuildingsCount: number;
  unverifiedBuildingsCount: number;
  unmappedBuildingsCount: number;
  unboundedBuildingsCount: number;
  uncoveredBuildingsCount: number;
  // Bloco 05 - Separado
  priceDisputesPending: number;
}

export interface GetModerationQueueParams {
  type?: 'ALL' | ModerationItemType;
  status?: string;
  city?: string;
  search?: string;
  limit?: number;
  page?: number;
  prismaClient?: any;
}

/**
 * Consulta contadores agregados da central de moderação.
 */
export async function getModerationSummary(options?: { prismaClient?: any }): Promise<ModerationSummary> {
  const prisma = options?.prismaClient || defaultPrisma;

  const [
    locPending,
    boundPending,
    facadePending,
    divergentBuildingsCount,
    unverifiedBuildingsCount,
    unmappedBuildingsCount,
    unboundedBuildingsCount,
    uncoveredBuildingsCount,
    priceDisputesPending,
  ] = await Promise.all([
    prisma.buildingLocationContribution.count({
      where: { status: { in: ['PENDING', 'FLAGGED_DIVERGENT'] } },
    }),
    prisma.buildingBoundaryContribution.count({
      where: { status: { in: ['PENDING', 'FLAGGED_DIVERGENT'] } },
    }),
    prisma.buildingImageContribution.count({
      where: { status: 'PENDING' },
    }),
    prisma.building.count({
      where: {
        OR: [
          { geoValidationStatus: 'DIVERGENT' },
          { boundaryValidationStatus: 'DIVERGENT' },
        ],
      },
    }),
    prisma.building.count({
      where: { geoValidationStatus: 'UNVERIFIED' },
    }),
    prisma.building.count({
      where: {
        OR: [{ latitude: null }, { longitude: null }],
      },
    }),
    prisma.building.count({
      where: { boundary: null },
    }),
    prisma.building.count({
      where: { coverImageUrl: null },
    }),
    // Contestações de Preço (Bloco 05 - mantido estritamente separado)
    prisma.propertyDispute.count({
      where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    }),
  ]);

  return {
    totalPending: locPending + boundPending + facadePending,
    locationPending: locPending,
    boundaryPending: boundPending,
    facadePending: facadePending,
    divergentBuildingsCount,
    unverifiedBuildingsCount,
    unmappedBuildingsCount,
    unboundedBuildingsCount,
    uncoveredBuildingsCount,
    priceDisputesPending,
  };
}

/**
 * Consulta a fila de pendências ou histórico de moderação com filtros combinados.
 */
export async function getModerationQueue(
  params: GetModerationQueueParams
): Promise<{ items: ModerationQueueItem[]; total: number; page: number; limit: number; totalPages: number }> {
  const { type = 'ALL', status = 'PENDING', city, search, limit = 50, page = 1, prismaClient } = params;
  const prisma = prismaClient || defaultPrisma;

  const take = Math.min(100, Math.max(1, limit));
  const skip = (Math.max(1, page) - 1) * take;

  const buildingFilter: any = {};
  if (city && city !== 'all' && city !== 'ALL') {
    buildingFilter.city = { equals: city, mode: 'insensitive' };
  }
  if (search && search.trim()) {
    buildingFilter.OR = [
      { name: { contains: search.trim(), mode: 'insensitive' } },
      { address: { contains: search.trim(), mode: 'insensitive' } },
      { neighborhood: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  const statusFilter =
    status === 'PENDING'
      ? { in: ['PENDING', 'FLAGGED_DIVERGENT'] }
      : status === 'ALL'
      ? undefined
      : { equals: status };

  const fetchLocation = type === 'ALL' || type === 'LOCATION';
  const fetchBoundary = type === 'ALL' || type === 'BOUNDARY';
  const fetchFacade = type === 'ALL' || type === 'FACADE';

  const promises: Promise<any[]>[] = [];
  const countPromises: Promise<number>[] = [];

  if (fetchLocation) {
    promises.push(
      prisma.buildingLocationContribution.findMany({
        where: {
          ...(statusFilter ? { status: statusFilter } : {}),
          building: Object.keys(buildingFilter).length > 0 ? buildingFilter : undefined,
        },
        include: {
          building: true,
          broker: { include: { profile: true } },
          decidedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    );
    countPromises.push(
      prisma.buildingLocationContribution.count({
        where: {
          ...(statusFilter ? { status: statusFilter } : {}),
          building: Object.keys(buildingFilter).length > 0 ? buildingFilter : undefined,
        },
      })
    );
  }

  if (fetchBoundary) {
    promises.push(
      prisma.buildingBoundaryContribution.findMany({
        where: {
          ...(statusFilter ? { status: statusFilter } : {}),
          building: Object.keys(buildingFilter).length > 0 ? buildingFilter : undefined,
        },
        include: {
          building: true,
          broker: { include: { profile: true } },
          decidedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    );
    countPromises.push(
      prisma.buildingBoundaryContribution.count({
        where: {
          ...(statusFilter ? { status: statusFilter } : {}),
          building: Object.keys(buildingFilter).length > 0 ? buildingFilter : undefined,
        },
      })
    );
  }

  if (fetchFacade) {
    // Para fachadas, não há FLAGGED_DIVERGENT, usa status direto
    const facadeStatusFilter =
      status === 'PENDING'
        ? { equals: 'PENDING' }
        : status === 'ALL'
        ? undefined
        : { equals: status };

    promises.push(
      prisma.buildingImageContribution.findMany({
        where: {
          ...(facadeStatusFilter ? { status: facadeStatusFilter } : {}),
          building: Object.keys(buildingFilter).length > 0 ? buildingFilter : undefined,
        },
        include: {
          building: true,
          broker: { include: { profile: true } },
          decidedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    );
    countPromises.push(
      prisma.buildingImageContribution.count({
        where: {
          ...(facadeStatusFilter ? { status: facadeStatusFilter } : {}),
          building: Object.keys(buildingFilter).length > 0 ? buildingFilter : undefined,
        },
      })
    );
  }

  const rawResults = await Promise.all(promises);
  const counts = await Promise.all(countPromises);
  const totalItems = counts.reduce((acc, c) => acc + c, 0);

  const unified: ModerationQueueItem[] = [];

  let resultIdx = 0;
  if (fetchLocation) {
    const locs = rawResults[resultIdx++] || [];
    for (const c of locs) {
      unified.push({
        id: c.id,
        type: 'LOCATION',
        contributionType: c.contributionType,
        status: c.status,
        source: c.source,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        justification: null,
        decisionNotes: c.decisionNotes,
        decidedAt: c.decidedAt ? c.decidedAt.toISOString() : null,
        building: {
          id: c.building.id,
          name: c.building.name,
          address: c.building.address,
          number: c.building.number,
          neighborhood: c.building.neighborhood,
          city: c.building.city,
          state: c.building.state,
          currentLatitude: c.building.latitude,
          currentLongitude: c.building.longitude,
          geoValidationStatus: c.building.geoValidationStatus,
        },
        broker: {
          id: c.broker.id,
          name: c.broker.name,
          email: c.broker.email,
          commercialName: c.broker.profile?.commercialName || null,
          creci: c.broker.profile?.creci || null,
          phone: c.broker.profile?.phone || null,
        },
        decidedBy: c.decidedBy || null,
        locationData: {
          latitude: c.latitude,
          longitude: c.longitude,
          distanceFromCurrent: c.distanceFromCurrent,
        },
      });
    }
  }

  if (fetchBoundary) {
    const bounds = rawResults[resultIdx++] || [];
    for (const c of bounds) {
      unified.push({
        id: c.id,
        type: 'BOUNDARY',
        contributionType: c.contributionType,
        status: c.status,
        source: c.source,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        justification: c.justification,
        decisionNotes: c.decisionNotes,
        decidedAt: c.decidedAt ? c.decidedAt.toISOString() : null,
        building: {
          id: c.building.id,
          name: c.building.name,
          address: c.building.address,
          number: c.building.number,
          neighborhood: c.building.neighborhood,
          city: c.building.city,
          state: c.building.state,
          currentBoundary: c.building.boundary,
          currentBoundaryArea: c.building.boundaryArea,
          boundaryValidationStatus: c.building.boundaryValidationStatus,
        },
        broker: {
          id: c.broker.id,
          name: c.broker.name,
          email: c.broker.email,
          commercialName: c.broker.profile?.commercialName || null,
          creci: c.broker.profile?.creci || null,
          phone: c.broker.profile?.phone || null,
        },
        decidedBy: c.decidedBy || null,
        boundaryData: {
          boundary: c.boundary,
          boundaryArea: c.boundaryArea,
          landParcelId: c.landParcelId,
        },
      });
    }
  }

  if (fetchFacade) {
    const images = rawResults[resultIdx++] || [];
    for (const c of images) {
      unified.push({
        id: c.id,
        type: 'FACADE',
        contributionType: c.contributionType,
        status: c.status,
        source: c.source,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        justification: c.justification,
        decisionNotes: c.decisionNotes,
        decidedAt: c.decidedAt ? c.decidedAt.toISOString() : null,
        building: {
          id: c.building.id,
          name: c.building.name,
          address: c.building.address,
          number: c.building.number,
          neighborhood: c.building.neighborhood,
          city: c.building.city,
          state: c.building.state,
          currentCoverImageUrl: c.building.coverImageUrl,
          coverImageValidationStatus: c.building.coverImageValidationStatus,
        },
        broker: {
          id: c.broker.id,
          name: c.broker.name,
          email: c.broker.email,
          commercialName: c.broker.profile?.commercialName || null,
          creci: c.broker.profile?.creci || null,
          phone: c.broker.profile?.phone || null,
        },
        decidedBy: c.decidedBy || null,
        facadeData: {
          imageUrl: c.imageUrl,
        },
      });
    }
  }

  // Ordena por data decrescente
  unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Paginação em memória caso mesclados
  const paginated = unified.slice(skip, skip + take);

  return {
    items: paginated,
    total: totalItems,
    page,
    limit: take,
    totalPages: Math.ceil(totalItems / take) || 1,
  };
}

/**
 * Consulta detalhada de uma contribuição individual por tipo e ID.
 */
export async function getContributionDetails(
  type: ModerationItemType,
  id: string,
  options?: { prismaClient?: any }
): Promise<ModerationQueueItem | null> {
  const prisma = options?.prismaClient || defaultPrisma;

  if (type === 'LOCATION') {
    const c = await prisma.buildingLocationContribution.findUnique({
      where: { id },
      include: {
        building: true,
        broker: { include: { profile: true } },
        decidedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!c) return null;

    return {
      id: c.id,
      type: 'LOCATION',
      contributionType: c.contributionType,
      status: c.status,
      source: c.source,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      justification: null,
      decisionNotes: c.decisionNotes,
      decidedAt: c.decidedAt ? c.decidedAt.toISOString() : null,
      building: {
        id: c.building.id,
        name: c.building.name,
        address: c.building.address,
        number: c.building.number,
        neighborhood: c.building.neighborhood,
        city: c.building.city,
        state: c.building.state,
        currentLatitude: c.building.latitude,
        currentLongitude: c.building.longitude,
        geoValidationStatus: c.building.geoValidationStatus,
      },
      broker: {
        id: c.broker.id,
        name: c.broker.name,
        email: c.broker.email,
        commercialName: c.broker.profile?.commercialName || null,
        creci: c.broker.profile?.creci || null,
        phone: c.broker.profile?.phone || null,
      },
      decidedBy: c.decidedBy || null,
      locationData: {
        latitude: c.latitude,
        longitude: c.longitude,
        distanceFromCurrent: c.distanceFromCurrent,
      },
    };
  }

  if (type === 'BOUNDARY') {
    const c = await prisma.buildingBoundaryContribution.findUnique({
      where: { id },
      include: {
        building: true,
        broker: { include: { profile: true } },
        decidedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!c) return null;

    return {
      id: c.id,
      type: 'BOUNDARY',
      contributionType: c.contributionType,
      status: c.status,
      source: c.source,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      justification: c.justification,
      decisionNotes: c.decisionNotes,
      decidedAt: c.decidedAt ? c.decidedAt.toISOString() : null,
      building: {
        id: c.building.id,
        name: c.building.name,
        address: c.building.address,
        number: c.building.number,
        neighborhood: c.building.neighborhood,
        city: c.building.city,
        state: c.building.state,
        currentBoundary: c.building.boundary,
        currentBoundaryArea: c.building.boundaryArea,
        boundaryValidationStatus: c.building.boundaryValidationStatus,
      },
      broker: {
        id: c.broker.id,
        name: c.broker.name,
        email: c.broker.email,
        commercialName: c.broker.profile?.commercialName || null,
        creci: c.broker.profile?.creci || null,
        phone: c.broker.profile?.phone || null,
      },
      decidedBy: c.decidedBy || null,
      boundaryData: {
        boundary: c.boundary,
        boundaryArea: c.boundaryArea,
        landParcelId: c.landParcelId,
      },
    };
  }

  if (type === 'FACADE') {
    const c = await prisma.buildingImageContribution.findUnique({
      where: { id },
      include: {
        building: true,
        broker: { include: { profile: true } },
        decidedBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!c) return null;

    return {
      id: c.id,
      type: 'FACADE',
      contributionType: c.contributionType,
      status: c.status,
      source: c.source,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      justification: c.justification,
      decisionNotes: c.decisionNotes,
      decidedAt: c.decidedAt ? c.decidedAt.toISOString() : null,
      building: {
        id: c.building.id,
        name: c.building.name,
        address: c.building.address,
        number: c.building.number,
        neighborhood: c.building.neighborhood,
        city: c.building.city,
        state: c.building.state,
        currentCoverImageUrl: c.building.coverImageUrl,
        coverImageValidationStatus: c.building.coverImageValidationStatus,
      },
      broker: {
        id: c.broker.id,
        name: c.broker.name,
        email: c.broker.email,
        commercialName: c.broker.profile?.commercialName || null,
        creci: c.broker.profile?.creci || null,
        phone: c.broker.profile?.phone || null,
      },
      decidedBy: c.decidedBy || null,
      facadeData: {
        imageUrl: c.imageUrl,
      },
    };
  }

  return null;
}

