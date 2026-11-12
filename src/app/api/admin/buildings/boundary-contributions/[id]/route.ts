import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { decideBoundaryContribution } from '@/lib/building-boundary-service';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { decision, manualBoundary, notes } = body;

    if (!['APPROVE', 'REJECT', 'MANUAL_OVERRIDE'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decisão inválida. Use APPROVE, REJECT ou MANUAL_OVERRIDE.' },
        { status: 400 }
      );
    }

    if (decision === 'MANUAL_OVERRIDE' && (!manualBoundary || typeof manualBoundary !== 'string')) {
      return NextResponse.json(
        { error: 'manualBoundary é obrigatório para decisões do tipo MANUAL_OVERRIDE.' },
        { status: 400 }
      );
    }

    const result = await decideBoundaryContribution({
      contributionId: id,
      adminId: user.id,
      decision,
      manualBoundary,
      decisionNotes: notes,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao decidir contribuição de terreno:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar decisão de terreno.' },
      { status: 400 }
    );
  }
}

