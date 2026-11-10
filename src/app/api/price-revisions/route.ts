import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'all';
    const statusParam = searchParams.get('status');
    const physicalPropertyId = searchParams.get('physicalPropertyId');

    const isAdmin = user.role === 'ADMIN';

    // Para corretores normais, identificar quais imóveis físicos possuem anúncio principal deste corretor
    let assignedPhysicalIds: string[] = [];
    if (!isAdmin || scope === 'assigned') {
      const primaryListings = await prisma.property.findMany({
        where: {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
          isPrimaryListing: true,
          status: 'Disponível',
          physicalPropertyId: { not: null },
        },
        select: { physicalPropertyId: true },
      });
      assignedPhysicalIds = primaryListings
        .map((p) => p.physicalPropertyId)
        .filter((id): id is string => Boolean(id));
    }

    const where: Prisma.PriceRevisionRequestWhereInput = {};

    if (statusParam) {
      where.status = statusParam as any;
    }

    if (physicalPropertyId) {
      where.physicalPropertyId = physicalPropertyId;
    }

    // Controle de acesso / visibilidade por escopo
    if (isAdmin && scope === 'all') {
      // Admin pode ver todas as solicitações sem filtro de usuário
    } else if (scope === 'mine') {
      where.requestingBrokerId = user.id;
    } else if (scope === 'assigned') {
      // Apenas solicitações onde o usuário é o corretor do anúncio principal do imóvel físico
      where.physicalPropertyId = { in: assignedPhysicalIds };
    } else {
      // Para corretores normais, 'all' significa tudo que lhe diz respeito (solicitadas ou sob sua responsabilidade)
      where.OR = [
        { requestingBrokerId: user.id },
        { physicalPropertyId: { in: assignedPhysicalIds } },
      ];
    }

    const requests = await prisma.priceRevisionRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requestingBroker: {
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
        property: {
          select: {
            id: true,
            internalCode: true,
            title: true,
            price: true,
            status: true,
            isPrimaryListing: true,
          },
        },
        physicalProperty: {
          select: {
            id: true,
            sharedPrice: true,
            primaryListingId: true,
            unit: {
              select: {
                unitNumber: true,
                tower: true,
              },
            },
            building: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
              },
            },
          },
        },
        dispute: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            resolvedAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error: any) {
    console.error('[GET /api/price-revisions] Erro ao listar solicitações:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao consultar solicitações de revisão de preço.' },
      { status: 500 }
    );
  }
}
