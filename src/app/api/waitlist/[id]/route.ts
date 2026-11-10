import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import { PropertyWaitlistService } from '@/lib/waitlist-service';

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
    const entry = await prisma.propertyWaitlist.findUnique({
      where: { id },
      include: {
        broker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        physicalProperty: {
          select: {
            id: true,
            sharedPrice: true,
            activeListingsCount: true,
            building: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
              },
            },
            unit: {
              select: {
                unitNumber: true,
                tower: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Inscrição não encontrada.' }, { status: 404 });
    }

    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin && entry.brokerId !== user.id) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar esta inscrição.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    console.error('[GET /api/waitlist/[id]] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao buscar inscrição.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const result = await PropertyWaitlistService.cancelWaitlist({
      waitlistId: id,
      brokerId: user.id,
    });

    if (!result.success) {
      let status = 400;
      if (result.reason === 'NOT_FOUND') status = 404;
      else if (result.reason === 'UNAUTHORIZED') status = 403;

      return NextResponse.json(
        { error: result.message, code: result.reason },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Inscrição na lista de espera cancelada com sucesso.',
      waitlistEntry: result.waitlistEntry,
    });
  } catch (error: any) {
    console.error('[DELETE /api/waitlist/[id]] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao cancelar inscrição.' },
      { status: 500 }
    );
  }
}

