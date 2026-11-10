import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const result = await PropertyWaitlistService.rejectOffer({
      waitlistId: id,
      brokerId: user.id,
      reason: body.reason,
    });

    if (!result.success) {
      let status = 400;
      if (result.reason === 'NOT_FOUND') status = 404;
      else if (result.reason === 'UNAUTHORIZED') status = 403;
      else if (result.reason === 'INVALID_STATUS') status = 409;

      return NextResponse.json(
        { error: result.message, code: result.reason },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Oferta recusada. A vaga foi liberada e oferecida ao próximo corretor da fila.',
      waitlistEntry: result.waitlistEntry,
      nextOfferCreated: result.nextOfferCreated,
    });
  } catch (error: any) {
    console.error('[POST /api/waitlist/[id]/reject] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao recusar oferta da lista de espera.' },
      { status: 500 }
    );
  }
}

