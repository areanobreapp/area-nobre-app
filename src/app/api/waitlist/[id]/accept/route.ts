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

    const result = await PropertyWaitlistService.acceptOffer({
      waitlistId: id,
      brokerId: user.id,
    });

    if (!result.success) {
      let status = 400;
      if (result.reason === 'NOT_FOUND' || result.reason === 'DRAFT_NOT_FOUND') status = 404;
      else if (result.reason === 'UNAUTHORIZED') status = 403;
      else if (result.reason === 'OFFER_EXPIRED' || result.reason === 'INVALID_STATUS' || result.reason === 'NO_CAPACITY') status = 409;

      return NextResponse.json(
        { error: result.message, code: result.reason },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Oferta aceita com sucesso! Seu anúncio agora está ativo com vaga garantida no imóvel físico.',
      waitlistEntry: result.waitlistEntry,
      activatedProperty: result.activatedProperty,
      slot: result.slot,
    });
  } catch (error: any) {
    console.error('[POST /api/waitlist/[id]/accept] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao aceitar oferta da lista de espera.' },
      { status: 500 }
    );
  }
}

