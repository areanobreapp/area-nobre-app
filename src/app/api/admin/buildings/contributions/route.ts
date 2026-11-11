import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const city = searchParams.get('city');
    const neighborhood = searchParams.get('neighborhood');
    const buildingId = searchParams.get('buildingId');
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (buildingId) {
      where.buildingId = buildingId;
    }

    if (city || neighborhood) {
      where.building = {};
      if (city && city !== 'all') {
        where.building.city = { equals: city, mode: 'insensitive' };
      }
      if (neighborhood) {
        where.building.neighborhood = { contains: neighborhood, mode: 'insensitive' };
      }
    }

    const contributions = await prisma.buildingLocationContribution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        building: {
          select: {
            id: true,
            name: true,
            address: true,
            number: true,
            neighborhood: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
            geoValidationStatus: true,
            geoConfidence: true,
            geoContributorsCount: true,
            externalId: true,
            source: true,
            verifiedByAdmin: true,
          },
        },
        broker: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                commercialName: true,
                creci: true,
                phone: true,
              },
            },
          },
        },
        decidedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Métricas analíticas do catálogo
    const [
      totalBuildings,
      unverifiedBuildings,
      estimatedBuildings,
      singleBrokerBuildings,
      multiBrokerBuildings,
      adminValidatedBuildings,
      divergentBuildings,
      pendingContributionsCount,
    ] = await Promise.all([
      prisma.building.count(),
      prisma.building.count({ where: { geoValidationStatus: 'UNVERIFIED' } }),
      prisma.building.count({ where: { geoValidationStatus: 'ESTIMATED' } }),
      prisma.building.count({ where: { geoValidationStatus: 'SINGLE_BROKER_CONFIRMED' } }),
      prisma.building.count({ where: { geoValidationStatus: 'MULTI_BROKER_CONFIRMED' } }),
      prisma.building.count({ where: { geoValidationStatus: 'ADMIN_VALIDATED' } }),
      prisma.building.count({ where: { geoValidationStatus: 'DIVERGENT' } }),
      prisma.buildingLocationContribution.count({
        where: { status: { in: ['PENDING', 'FLAGGED_DIVERGENT'] } },
      }),
    ]);

    return NextResponse.json({
      contributions,
      metrics: {
        totalBuildings,
        unverifiedBuildings,
        estimatedBuildings,
        singleBrokerBuildings,
        multiBrokerBuildings,
        adminValidatedBuildings,
        divergentBuildings,
        pendingContributionsCount,
      },
    });
  } catch (error: any) {
    console.error('Erro ao consultar contribuições administrativas:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar propostas de localização.' },
      { status: 500 }
    );
  }
}

