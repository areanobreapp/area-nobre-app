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

    const { reason } = body;

    const result = await PriceRevisionService.acceptRequest({
      requestId: id,
      userId: user.id,
      userRole: user.role,
      reason: reason ? String(reason).trim() : null,
    });

    if (!result.success) {
      let statusCode = 400;
      if (result.reason === 'NOT_FOUND') statusCode = 404;
      else if (result.reason === 'UNAUTHORIZED_NOT_PRIMARY') statusCode = 403;
      else if (result.reason === 'NOT_PENDING' || result.reason === 'STALE_PRICE') statusCode = 409;

      return NextResponse.json(
        { error: result.message, code: result.reason },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitação de revisão aceita e preço sincronizado.',
      request: result.request,
      updatedPrice: result.updatedPrice,
    });
  } catch (error: any) {
    console.error('[POST /api/price-revisions/[id]/accept] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao aceitar solicitação de revisão.' },
      { status: 500 }
    );
  }
}

