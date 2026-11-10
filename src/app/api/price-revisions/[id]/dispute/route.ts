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

    const { justification, documentProofUrl } = body;

    const result = await PriceRevisionService.escalateToDispute({
      requestId: id,
      userId: user.id,
      justification: justification ? String(justification).trim() : null,
      documentProofUrl: documentProofUrl ? String(documentProofUrl).trim() : null,
    });

    if (!result.success) {
      let statusCode = 400;
      if (result.reason === 'NOT_FOUND') statusCode = 404;
      else if (result.reason === 'UNAUTHORIZED') statusCode = 403;
      else if (result.reason === 'CANNOT_DISPUTE_STATUS' || result.reason === 'ALREADY_DISPUTED') statusCode = 409;

      return NextResponse.json(
        { error: result.message, code: result.reason },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contestação administrativa aberta com sucesso.',
      dispute: result.dispute,
    });
  } catch (error: any) {
    console.error('[POST /api/price-revisions/[id]/dispute] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao encaminhar contestação.' },
      { status: 500 }
    );
  }
}

