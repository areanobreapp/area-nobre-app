import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;

    const request = await prisma.priceRevisionRequest.findUnique({
      where: { id },
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
        dispute: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Solicitação de revisão de preço não encontrada.' },
        { status: 404 }
      );
    }

    const isAdmin = user.role === 'ADMIN';
    const isRequester = request.requestingBrokerId === user.id;
    let isPrimaryBroker = false;

    if (request.physicalProperty?.primaryListingId) {
      const primaryListing = await prisma.property.findUnique({
        where: { id: request.physicalProperty.primaryListingId },
        select: { userId: true, responsibleBrokerId: true, status: true },
      });
      if (
        primaryListing &&
        primaryListing.status === 'Disponível' &&
        (primaryListing.userId === user.id || primaryListing.responsibleBrokerId === user.id)
      ) {
        isPrimaryBroker = true;
      }
    }

    if (!isAdmin && !isRequester && !isPrimaryBroker) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar esta solicitação de revisão de preço.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      request,
    });
  } catch (error: any) {
    console.error('[GET /api/price-revisions/[id]] Erro ao buscar solicitação:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao buscar detalhes da solicitação.' },
      { status: 500 }
    );
  }
}
