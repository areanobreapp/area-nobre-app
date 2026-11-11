import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  processLocationContribution,
  ContributionType,
} from '@/lib/building-location-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;

    const building = await prisma.building.findUnique({
      where: { id },
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
        geoConfidence: true,
        geoContributorsCount: true,
        geoLastConfirmedAt: true,
        geoAdminDecidedAt: true,
        verifiedByAdmin: true,
      },
    });

    if (!building) {
      return NextResponse.json({ error: 'Edifício não encontrado.' }, { status: 404 });
    }

    // Busca contribuições registradas para este edifício
    const contributions = await prisma.buildingLocationContribution.findMany({
      where: { buildingId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        broker: {
          select: {
            id: true,
            name: true,
            role: true,
            profile: {
              select: {
                commercialName: true,
                creci: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      building,
      contributions,
    });
  } catch (error: any) {
    console.error('Erro ao consultar contribuições de localização:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar dados de localização.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { latitude, longitude, contributionType, source } = body;

    const validTypes: ContributionType[] = [
      'CONFIRMED_EXISTING',
      'PROPOSED_NEW',
      'PROPOSED_ADJUSTMENT',
      'SKIPPED',
    ];

    if (!contributionType || !validTypes.includes(contributionType)) {
      return NextResponse.json(
        { error: 'Tipo de contribuição inválido.' },
        { status: 400 }
      );
    }

    // Se não for SKIPPED, coordenadas são obrigatórias e devem ser numéricas válidas
    if (contributionType !== 'SKIPPED') {
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        isNaN(latitude) ||
        isNaN(longitude) ||
        !isFinite(latitude) ||
        !isFinite(longitude)
      ) {
        return NextResponse.json(
          { error: 'Coordenadas (latitude e longitude) devem ser números válidos.' },
          { status: 400 }
        );
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          { error: 'Coordenadas geográficas fora dos limites válidos.' },
          { status: 400 }
        );
      }
    }

    const result = await processLocationContribution({
      buildingId: id,
      brokerId: user.id,
      latitude: Number(latitude || 0),
      longitude: Number(longitude || 0),
      contributionType,
      source: source || 'BROKER_MAP_PIN',
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao registrar contribuição de localização:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar contribuição.' },
      { status: 400 }
    );
  }
}

