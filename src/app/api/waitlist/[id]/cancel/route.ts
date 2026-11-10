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
    console.error('[POST /api/waitlist/[id]/cancel] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao cancelar inscrição.' },
      { status: 500 }
    );
  }
}

