import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const typeParam = searchParams.get('type');
    const physicalPropertyId = searchParams.get('physicalPropertyId');

    const where: Prisma.PropertyDisputeWhereInput = {};

    if (statusParam) {
      where.status = statusParam;
    }

    if (typeParam) {
      where.type = typeParam;
    }

    if (physicalPropertyId) {
      where.physicalPropertyId = physicalPropertyId;
    }

    const disputes = await prisma.propertyDispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        claimantBroker: {
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
        priceRevisions: {
          select: {
            id: true,
            currentPrice: true,
            suggestedPrice: true,
            justification: true,
            documentProofUrl: true,
            status: true,
            createdAt: true,
            decidedAt: true,
            decisionReason: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: disputes.length,
      disputes,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/disputes] Erro ao listar contestações:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao consultar contestações administrativas.' },
      { status: 500 }
    );
  }
}
