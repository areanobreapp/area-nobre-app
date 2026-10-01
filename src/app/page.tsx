import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MATCH_THRESHOLD } from '@/lib/matching/config';
import HomeMapClient from '@/components/HomeMapClient';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ buscaId?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { buscaId } = (await searchParams) || {};

  // Base compartilhada: carrega imóveis e empreendimentos de todos os corretores ativos
  const activeBrokerCondition = {
    OR: [
      { responsibleBroker: { status: 'ACTIVE' } },
      { responsibleBrokerId: null, user: { status: 'ACTIVE' } },
    ],
  };

  const [rawProperties, rawDevelopments, activeSearchesCount, relevantMatchesCount, topMatches, activeSearchRecord] = await Promise.all([
    prisma.property.findMany({
      where: activeBrokerCondition,
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        responsibleBroker: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            profile: {
              select: {
                commercialName: true,
                phone: true,
                creci: true,
                avatarUrl: true,
                logoUrl: true,
                city: true,
                tagline: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.development.findMany({
      where: activeBrokerCondition,
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        typologies: {
          orderBy: { price: 'asc' },
        },
        responsibleBroker: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            profile: {
              select: {
                commercialName: true,
                phone: true,
                creci: true,
                avatarUrl: true,
                logoUrl: true,
                city: true,
                tagline: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.search.count({
      where: { userId: user.id, active: true },
    }),
    prisma.match.count({
      where: {
        score: { gte: MATCH_THRESHOLD },
        search: { userId: user.id, active: true },
      },
    }),
    prisma.match.findMany({
      where: {
        score: { gte: MATCH_THRESHOLD },
        search: { userId: user.id, active: true },
      },
      include: {
        property: {
          include: {
            images: {
              where: { isCover: true },
              take: 1,
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
              },
            },
          },
        },
        search: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { score: 'desc' },
      take: 5,
    }),
    buscaId
      ? prisma.search.findUnique({
          where: { id: buscaId, userId: user.id },
          include: {
            client: true,
            matches: {
              include: {
                property: {
                  include: {
                    images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
                    responsibleBroker: {
                      select: {
                        id: true,
                        name: true,
                        profile: true,
                      },
                    },
                  },
                },
                typology: {
                  include: {
                    development: {
                      include: {
                        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
                        responsibleBroker: {
                          select: {
                            id: true,
                            name: true,
                            profile: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { score: 'desc' },
            },
          },
        })
      : null,
  ]);

  // Sanitização de campos privados para imóveis/empreendimentos de outros corretores
  const isUserAdmin = user.role === 'ADMIN';

  const properties = rawProperties.map((p) => {
    const isOwner = p.responsibleBrokerId === user.id || p.userId === user.id || isUserAdmin;
    if (isOwner) return p;
    return {
      ...p,
      internalNotes: null,
      exchangeNotes: null,
      registryNumber: null,
      boundary: null,
      boundaryArea: null,
    };
  });

  const developments = rawDevelopments.map((d) => {
    const isOwner = d.responsibleBrokerId === user.id || d.userId === user.id || isUserAdmin;
    if (isOwner) return d;
    return {
      ...d,
      typologies: d.typologies?.map((t) => ({
        ...t,
        notes: null,
      })),
    };
  });

  const formattedMatches = topMatches.map((m) => {
    let parsedExplanation = [];
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

  let activeSearchContext: any = null;
  if (activeSearchRecord) {
    const formattedSearchMatches = (activeSearchRecord.matches || []).map((m) => {
      let parsedExplanation = [];
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

    activeSearchContext = {
      ...activeSearchRecord,
      matches: formattedSearchMatches,
    };
  }

  const kpis = {
    propertiesCount: properties.length,
    developmentsCount: developments.length,
    activeSearchesCount,
    relevantMatchesCount,
  };

  return (
    <HomeMapClient
      initialProperties={properties as any}
      initialDevelopments={developments as any}
      kpis={kpis}
      recentMatches={formattedMatches}
      user={user}
      activeSearchContext={activeSearchContext}
    />
  );
}
