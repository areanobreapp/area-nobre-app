import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import { PropertyWaitlistService } from '@/lib/waitlist-service';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const physicalPropertyId = searchParams.get('physicalPropertyId');

    const isAdmin = user.role === 'ADMIN';
    const scope = searchParams.get('scope') || 'mine';

    const where: Prisma.PropertyWaitlistWhereInput = {};

    if (!isAdmin || scope === 'mine') {
      where.brokerId = user.id;
    }

    if (statusParam) {
      where.status = statusParam;
    }

    if (physicalPropertyId) {
      where.physicalPropertyId = physicalPropertyId;
    }

    const entries = await prisma.propertyWaitlist.findMany({
      where,
      orderBy: [{ physicalPropertyId: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
      include: {
        broker: {
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                commercialName: true,
                phone: true,
                creci: true,
              },
            },
          },
        },
        physicalProperty: {
          select: {
            id: true,
            sharedPrice: true,
            activeListingsCount: true,
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
      },
    });

    const draftIds = entries
      .map((e) => e.draftPropertyId)
      .filter((id): id is string => typeof id === 'string');

    const drafts = draftIds.length > 0
      ? await prisma.property.findMany({
          where: { id: { in: draftIds } },
          select: { id: true, title: true, price: true, status: true },
        })
      : [];
    const draftsMap = new Map(drafts.map((d) => [d.id, d]));

    const enrichedEntries = entries.map((e) => ({
      ...e,
      draftProperty: e.draftPropertyId ? draftsMap.get(e.draftPropertyId) || null : null,
    }));

    return NextResponse.json({
      success: true,
      count: enrichedEntries.length,
      entries: enrichedEntries,
    });
  } catch (error: any) {
    console.error('[GET /api/waitlist] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao consultar inscrições na lista de espera.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const body = await req.json();
    const { physicalPropertyId, draftPropertyId } = body;

    if (!physicalPropertyId) {
      return NextResponse.json(
        { error: 'O ID do imóvel físico (physicalPropertyId) é obrigatório.', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    const result = await PropertyWaitlistService.joinWaitlist({
      physicalPropertyId,
      brokerId: user.id,
      draftPropertyId: draftPropertyId || null,
    });

    if (!result.success) {
      let status = 400;
      if (result.reason === 'PHYSICAL_PROPERTY_NOT_FOUND') status = 404;
      else if (result.reason === 'ALREADY_ACTIVE') status = 403;
      else if (result.reason === 'DUPLICATE_WAITLIST') status = 409;

      return NextResponse.json(
        { error: result.message, code: result.reason },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Inscrição na lista de espera realizada com sucesso. Sua posição: ${result.position}º.`,
      waitlistEntry: result.waitlistEntry,
      position: result.position,
    });
  } catch (error: any) {
    console.error('[POST /api/waitlist] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao cadastrar na lista de espera.' },
      { status: 500 }
    );
  }
}

