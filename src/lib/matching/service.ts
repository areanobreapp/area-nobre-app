import { prisma } from '@/lib/db';
import { calculateMatch } from './engine';
import { normalizeProperty, normalizeTypology, parseSearchCriteria } from './normalizer';
import { MATCH_CONFIG, isMatch } from './config';
import { isPlausibleTravelTimeCandidate, getDrivingDistanceAndDuration } from '@/lib/geo';
import { NormalizedOffer, SearchCriteria } from './types';

/**
 * Enriquece a oferta com os dados viários da GeoBase se a estratégia da busca for TRAVEL_TIME.
 * 
 * Segue o pipeline de pré-filtro obrigatório da Fase 5.2.1:
 * 1. Hard filters normais (preço, finalidade, tipo, etc.) preliminares.
 * 2. Critérios estruturais eliminatórios.
 * 3. Pré-filtro geográfico local conservador (120 km/h + 25% de margem em linha reta).
 * 4. Consulta GeoBase /routing/distance com cache centralizado.
 */
async function enrichOfferWithTravelTime(
  search: SearchCriteria,
  offer: NormalizedOffer
): Promise<NormalizedOffer> {
  if (search.locationStrategy !== 'TRAVEL_TIME') {
    return offer;
  }

  // Se a busca ou a oferta não possuem coordenadas ou tempo válido, retorna sem duração
  if (
    search.searchLatitude == null ||
    search.searchLongitude == null ||
    !search.maxTravelTimeMinutes ||
    offer.latitude == null ||
    offer.longitude == null
  ) {
    return offer;
  }

  // 1 & 2. Pré-filtro de critérios normais e estruturais:
  // Testamos a oferta simulando duration 0 para ver se ela falha em qualquer outro hard filter
  const testOffer: NormalizedOffer = { ...offer, travelDurationSeconds: 0 };
  const preliminary = calculateMatch(search, testOffer);
  const failedNonLocation = preliminary.reasons.some(
    (r) =>
      !r.toLowerCase().includes('tempo de deslocamento') &&
      !r.toLowerCase().includes('coordenadas') &&
      !r.toLowerCase().includes('raio')
  );
  if (failedNonLocation) {
    return offer;
  }

  // 3. Pré-filtro geográfico local conservador (limite físico em linha reta a 120km/h + 25%)
  const isPlausible = isPlausibleTravelTimeCandidate(
    search.searchLatitude,
    search.searchLongitude,
    offer.latitude,
    offer.longitude,
    search.maxTravelTimeMinutes
  );
  if (!isPlausible) {
    // Claramente além do alcance físico possível: definimos duração que excede o limite
    // para ser rejeitado de forma consistente pelo Hard Filter
    return {
      ...offer,
      travelDurationSeconds: (search.maxTravelTimeMinutes + 10) * 60,
      travelDistanceMeters: undefined,
    };
  }

  // 4. Chamada GeoBase com cache centralizado
  try {
    const route = await getDrivingDistanceAndDuration(
      search.searchLatitude,
      search.searchLongitude,
      offer.latitude,
      offer.longitude
    );

    if (route.success && route.durationSeconds != null) {
      return {
        ...offer,
        travelDurationSeconds: route.durationSeconds,
        travelDistanceMeters: route.drivingDistanceMeters ?? undefined,
      };
    }
  } catch (err) {
    console.error('Erro ao calcular rota GeoBase para matching:', err);
  }

  // Falha na GeoBase ou rota indisponível: duration permanece undefined
  return offer;
}

/**
 * Recalcula todos os matches para uma busca específica
 */
export async function recalculateMatchesForSearch(searchId: string): Promise<number> {
  const search = await prisma.search.findUnique({
    where: { id: searchId },
    include: { client: true },
  });

  if (!search) {
    await prisma.match.deleteMany({ where: { searchId } });
    return 0;
  }

  // Se a busca estiver inativa, limpa matches existentes
  if (!search.active) {
    await prisma.match.deleteMany({ where: { searchId } });
    return 0;
  }

  const searchCriteria = parseSearchCriteria(search);

  // Busca todos os imóveis convencionais disponíveis de corretores ativos na plataforma (Fase 5.4)
  const properties = await prisma.property.findMany({
    where: {
      status: 'Disponível',
      user: { status: 'ACTIVE' },
    },
    include: {
      images: {
        orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
      },
    },
  });

  // Busca todos os empreendimentos ativos e tipologias disponíveis de corretores ativos (Fase 5.4)
  const developments = await prisma.development.findMany({
    where: {
      status: 'Ativo',
      user: { status: 'ACTIVE' },
    },
    include: {
      images: {
        orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
      },
      typologies: {
        where: {
          status: 'Disponível',
        },
      },
    },
  });

  // Limpa matches anteriores desta busca
  await prisma.match.deleteMany({ where: { searchId } });

  const matchesToCreate: Array<{
    searchId: string;
    offerType: 'PROPERTY' | 'TYPOLOGY';
    propertyId?: string;
    typologyId?: string;
    score: number;
    explanation: string;
  }> = [];

  // Avalia imóveis convencionais
  for (const property of properties) {
    let offer = normalizeProperty(property);
    offer = await enrichOfferWithTravelTime(searchCriteria, offer);
    const result = calculateMatch(searchCriteria, offer);
    if (isMatch(result.score, result.eligible)) {
      matchesToCreate.push({
        searchId: search.id,
        offerType: 'PROPERTY',
        propertyId: property.id,
        score: result.score,
        explanation: JSON.stringify(result.explanation),
      });
    }
  }

  // Avalia tipologias de empreendimentos
  for (const dev of developments) {
    for (const typo of dev.typologies) {
      let offer = normalizeTypology(typo, dev);
      offer = await enrichOfferWithTravelTime(searchCriteria, offer);
      const result = calculateMatch(searchCriteria, offer);
      if (isMatch(result.score, result.eligible)) {
        matchesToCreate.push({
          searchId: search.id,
          offerType: 'TYPOLOGY',
          typologyId: typo.id,
          score: result.score,
          explanation: JSON.stringify(result.explanation),
        });
      }
    }
  }

  if (matchesToCreate.length > 0) {
    await prisma.match.createMany({
      data: matchesToCreate,
    });
  }

  return matchesToCreate.length;
}

/**
 * Recalcula matches para um imóvel convencional quando criado, editado ou reativado
 */
export async function recalculateMatchesForProperty(propertyId: string): Promise<number> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      images: {
        orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
      },
    },
  });

  // Se o imóvel não existe ou não está disponível, apaga matches
  if (!property || property.status !== 'Disponível') {
    await prisma.match.deleteMany({ where: { propertyId } });
    return 0;
  }

  const offer = normalizeProperty(property);

  // Busca todas as demandas ativas de corretores ativos na plataforma (Fase 5.4)
  const activeSearches = await prisma.search.findMany({
    where: {
      active: true,
      user: { status: 'ACTIVE' },
    },
    include: { client: true },
  });

  // Remove matches antigos deste imóvel
  await prisma.match.deleteMany({ where: { propertyId } });

  const matchesToCreate: Array<{
    searchId: string;
    offerType: 'PROPERTY';
    propertyId: string;
    score: number;
    explanation: string;
  }> = [];

  for (const search of activeSearches) {
    const searchCriteria = parseSearchCriteria(search);
    const enrichedOffer = await enrichOfferWithTravelTime(searchCriteria, offer);
    const result = calculateMatch(searchCriteria, enrichedOffer);
    if (isMatch(result.score, result.eligible)) {
      matchesToCreate.push({
        searchId: search.id,
        offerType: 'PROPERTY',
        propertyId: property.id,
        score: result.score,
        explanation: JSON.stringify(result.explanation),
      });
    }
  }

  if (matchesToCreate.length > 0) {
    await prisma.match.createMany({
      data: matchesToCreate,
    });
  }

  return matchesToCreate.length;
}

/**
 * Recalcula matches para um empreendimento e suas tipologias
 */
export async function recalculateMatchesForDevelopment(developmentId: string): Promise<number> {
  const development = await prisma.development.findUnique({
    where: { id: developmentId },
    include: {
      images: {
        orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
      },
      typologies: true,
    },
  });

  if (!development) {
    return 0;
  }

  const allTypologyIds = development.typologies.map((t) => t.id);

  // Se o empreendimento não estiver ativo, remove matches das tipologias
  if (development.status !== 'Ativo') {
    if (allTypologyIds.length > 0) {
      await prisma.match.deleteMany({
        where: { typologyId: { in: allTypologyIds } },
      });
    }
    return 0;
  }

  // Remove matches antigos das tipologias deste empreendimento
  if (allTypologyIds.length > 0) {
    await prisma.match.deleteMany({
      where: { typologyId: { in: allTypologyIds } },
    });
  }

  // Filtra tipologias disponíveis
  const availableTypologies = development.typologies.filter((t) => t.status === 'Disponível');
  if (availableTypologies.length === 0) return 0;

  // Busca todas as demandas ativas de corretores ativos na plataforma (Fase 5.4)
  const activeSearches = await prisma.search.findMany({
    where: {
      active: true,
      user: { status: 'ACTIVE' },
    },
    include: { client: true },
  });

  const matchesToCreate: Array<{
    searchId: string;
    offerType: 'TYPOLOGY';
    typologyId: string;
    score: number;
    explanation: string;
  }> = [];

  for (const typo of availableTypologies) {
    const offer = normalizeTypology(typo, development);
    for (const search of activeSearches) {
      const searchCriteria = parseSearchCriteria(search);
      const enrichedOffer = await enrichOfferWithTravelTime(searchCriteria, offer);
      const result = calculateMatch(searchCriteria, enrichedOffer);
      if (isMatch(result.score, result.eligible)) {
        matchesToCreate.push({
          searchId: search.id,
          offerType: 'TYPOLOGY',
          typologyId: typo.id,
          score: result.score,
          explanation: JSON.stringify(result.explanation),
        });
      }
    }
  }

  if (matchesToCreate.length > 0) {
    await prisma.match.createMany({
      data: matchesToCreate,
    });
  }

  return matchesToCreate.length;
}

/**
 * Recalcula todos os matches da carteira do usuário
 */
export async function recalculateMatchesForUser(userId: string): Promise<number> {
  const searches = await prisma.search.findMany({
    where: { userId, active: true },
    select: { id: true },
  });

  let total = 0;
  for (const s of searches) {
    total += await recalculateMatchesForSearch(s.id);
  }
  return total;
}

/**
 * Retorna os top matches relevantes (score >= 70) para a Home
 */
export async function getTopRelevantMatches(userId: string, limit = 5) {
  const matches = await prisma.match.findMany({
    where: {
      score: { gte: MATCH_CONFIG.MATCH_THRESHOLD },
      search: {
        userId,
        active: true,
      },
    },
    include: {
      search: {
        include: { client: true },
      },
      property: {
        include: {
          images: {
            where: { isCover: true },
            take: 1,
          },
          responsibleBroker: {
            select: {
              id: true,
              name: true,
              profile: {
                select: { commercialName: true },
              },
            },
          },
        },
      },
      typology: {
        include: {
          development: {
            include: {
              images: {
                where: { isCover: true },
                take: 1,
              },
              responsibleBroker: {
                select: {
                  id: true,
                  name: true,
                  profile: {
                    select: { commercialName: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { score: 'desc' },
    take: limit,
  });

  return matches.map((m) => {
    let parsedExplanation: any[] = [];
    try {
      parsedExplanation = JSON.parse(m.explanation);
    } catch {
      parsedExplanation = [];
    }

    return {
      ...m,
      parsedExplanation,
    };
  });
}
