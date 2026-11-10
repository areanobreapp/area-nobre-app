import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import { PriceRevisionService } from '@/lib/price-revision-service';

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

    const decisionReason = body.decisionReason || body.reason;

    if (!decisionReason || String(decisionReason).trim().length === 0) {
      return NextResponse.json(
        { error: 'A justificativa para a recusa da solicitação de revisão é obrigatória.', code: 'INVALID_DECISION' },
        { status: 400 }
      );
    }

    const result = await PriceRevisionService.rejectRequest({
      requestId: id,
      userId: user.id,
      userRole: user.role,
      decisionReason: String(decisionReason).trim(),
    });

    if (!result.success) {
      let statusCode = 400;
      if (result.reason === 'NOT_FOUND') statusCode = 404;
      else if (result.reason === 'UNAUTHORIZED_NOT_PRIMARY') statusCode = 403;
      else if (result.reason === 'NOT_PENDING') statusCode = 409;

      return NextResponse.json(
        { error: result.message, code: result.reason },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitação de revisão recusada com sucesso.',
      request: result.request,
    });
  } catch (error: any) {
    console.error('[POST /api/price-revisions/[id]/reject] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao recusar solicitação de revisão.' },
      { status: 500 }
    );
  }
}

