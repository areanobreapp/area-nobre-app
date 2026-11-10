import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { PriceRevisionService } from '@/lib/price-revision-service';
import { validateNonNegativeFloat } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { action, approvedPrice, adminNotes } = body;

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { error: 'Ação inválida. Utilize APPROVE ou REJECT.', code: 'INVALID_ACTION' },
        { status: 400 }
      );
    }

    if (!adminNotes || String(adminNotes).trim().length === 0) {
      return NextResponse.json(
        { error: 'O parecer / justificativa administrativa é obrigatório.', code: 'INVALID_NOTES' },
        { status: 400 }
      );
    }

    let parsedApprovedPrice: number | undefined = undefined;
    if (action === 'APPROVE' && approvedPrice !== undefined && approvedPrice !== null) {
      const validation = validateNonNegativeFloat(approvedPrice, 'Preço aprovado', {
        required: false,
        isCurrencyString: true,
      });

      if (validation.error || validation.value === null || validation.value <= 0) {
        return NextResponse.json(
          { error: 'O preço aprovado deve ser um valor numérico positivo maior que zero.', code: 'INVALID_PRICE' },
          { status: 400 }
        );
      }
      parsedApprovedPrice = validation.value;
    }

    const result = await PriceRevisionService.resolveDispute({
      disputeId: id,
      adminUserId: admin.id,
      action,
      approvedPrice: parsedApprovedPrice,
      adminNotes: String(adminNotes).trim(),
    });

    if (!result.success) {
      let statusCode = 400;
      if (result.reason === 'NOT_FOUND') statusCode = 404;
      else if (result.reason === 'NOT_PENDING') statusCode = 409;
      else if (result.reason === 'UNAUTHORIZED') statusCode = 403;

      return NextResponse.json(
        { error: result.message, code: result.reason },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'APPROVE'
          ? 'Contestação deferida e preço compartilhado atualizado com sucesso.'
          : 'Contestação indeferida e preço vigente mantido.',
      dispute: result.dispute,
      newPrice: result.newPrice,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/disputes/[id]/resolve] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao processar resolução de contestação.' },
      { status: 500 }
    );
  }
}

