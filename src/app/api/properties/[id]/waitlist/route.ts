import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import { PropertyWaitlistService } from '@/lib/waitlist-service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        responsibleBrokerId: true,
        physicalPropertyId: true,
        status: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Anúncio não encontrado.' }, { status: 404 });
    }

    if (!property.physicalPropertyId) {
      return NextResponse.json(
        { error: 'Este anúncio não possui identidade física vinculada para lista de espera.' },
        { status: 400 }
      );
    }

    const isOwner = property.userId === user.id || property.responsibleBrokerId === user.id;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Se o próprio anúncio for do corretor e não for Disponível, pode ser o draft
    let draftPropertyId = body.draftPropertyId;
    if (!draftPropertyId && isOwner && property.status !== 'Disponível') {
      draftPropertyId = property.id;
    }

    const result = await PropertyWaitlistService.joinWaitlist({
      physicalPropertyId: property.physicalPropertyId,
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
    console.error('[POST /api/properties/[id]/waitlist] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao entrar na lista de espera.' },
      { status: 500 }
    );
  }
}

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
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        responsibleBrokerId: true,
        physicalPropertyId: true,
        status: true,
        physicalProperty: {
          select: {
            id: true,
            activeListingsCount: true,
            sharedPrice: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Anúncio não encontrado.' }, { status: 404 });
    }

    if (!property.physicalPropertyId) {
      return NextResponse.json({
        hasWaitlist: false,
        message: 'Imóvel sem identidade física compartilhada.',
      });
    }

    const physicalPropertyId = property.physicalPropertyId;

    // Contagem de corretores esperando
    const waitingCount = await prisma.propertyWaitlist.count({
      where: {
        physicalPropertyId,
        status: { in: ['WAITING', 'PENDING_NOTIFICATION', 'OFFERED'] },
      },
    });

    // Inscrição específica do usuário autenticado se houver
    const userEntry = await prisma.propertyWaitlist.findFirst({
      where: {
        physicalPropertyId,
        brokerId: user.id,
        status: { in: ['WAITING', 'PENDING_NOTIFICATION', 'OFFERED'] },
      },
      select: {
        id: true,
        position: true,
        status: true,
        notifiedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    let relativePosition: number | null = null;
    if (userEntry && userEntry.status === 'WAITING') {
      const aheadCount = await prisma.propertyWaitlist.count({
        where: {
          physicalPropertyId,
          status: 'WAITING',
          position: { lt: userEntry.position },
        },
      });
      relativePosition = aheadCount + 1;
    }

    return NextResponse.json({
      success: true,
      physicalPropertyId,
      activeListingsCount: property.physicalProperty?.activeListingsCount || 0,
      totalWaiting: waitingCount,
      userWaitlist: userEntry
        ? {
            ...userEntry,
            relativePosition,
          }
        : null,
    });
  } catch (error: any) {
    console.error('[GET /api/properties/[id]/waitlist] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao consultar fila de espera.' },
      { status: 500 }
    );
  }
}

